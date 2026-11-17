/**
 * Version-aware, append-only assessment evidence independent from self-rated study reviews.
 * This is an explicit answer-key evaluation, not a mastery prediction.
 */
import { validateKnowledgeCore } from './knowledge-core.js';

function id(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be nonempty');
  return value.trim();
}
function iso(value) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) throw new TypeError('invalid assessment timestamp');
  return d.toISOString();
}
function choices(question) {
  if (!Array.isArray(question.choices) || question.choices.length < 2) throw new TypeError('question needs at least two choices');
  const options = new Set();
  for (const choice of question.choices) {
    const key = id(choice.id, 'choice.id');
    if (options.has(key)) throw new RangeError('duplicate choice id');
    options.add(key);
    if (choice.misconceptionId != null) id(choice.misconceptionId, 'misconceptionId');
  }
  if (!options.has(id(question.correctChoiceId, 'correctChoiceId'))) throw new RangeError('answer key not in choices');
  return options;
}
function questionIndex(core) {
  validateKnowledgeCore(core);
  const map = new Map();
  for (const q of core.questions) {
    if (q.choices != null || q.correctChoiceId != null) choices(q);
    map.set(q.id, q);
  }
  return map;
}
export function createAssessmentHistory() {
  return { format: 'fark-assessment-history', version: 1, attempts: [] };
}
export function validateAssessmentHistory(history) {
  if (!history || history.format !== 'fark-assessment-history' || history.version !== 1 || !Array.isArray(history.attempts)) {
    throw new TypeError('invalid assessment history');
  }
  const seen = new Set();
  for (const attempt of history.attempts) {
    id(attempt.id, 'attempt.id');
    if (seen.has(attempt.id)) throw new RangeError('duplicate attempt id');
    seen.add(attempt.id);
    id(attempt.questionId, 'questionId');
    id(attempt.questionRevision, 'questionRevision');
    id(attempt.selectedChoiceId, 'selectedChoiceId');
    id(attempt.correctChoiceId, 'correctChoiceId');
    iso(attempt.at);
    if (typeof attempt.correct !== 'boolean') throw new TypeError('correct must be boolean');
    if (attempt.correct !== (attempt.selectedChoiceId === attempt.correctChoiceId)) throw new RangeError('inconsistent answer result');
    if (!Array.isArray(attempt.outcomeIds)) throw new TypeError('outcomeIds must be array');
    if (new Set(attempt.outcomeIds).size !== attempt.outcomeIds.length) throw new RangeError('duplicate attempt outcomes');
    for (const outcomeId of attempt.outcomeIds) id(outcomeId, 'outcomeId');
    if (attempt.misconceptionId != null) id(attempt.misconceptionId, 'misconceptionId');
  }
  return history;
}
/** Append a verified answer, snapshotting question revision and outcome IDs for auditability. */
export function recordAssessment(core, history, { attemptId, questionId, selectedChoiceId, at }) {
  validateAssessmentHistory(history);
  const question = questionIndex(core).get(id(questionId, 'questionId'));
  if (!question) throw new RangeError('unknown question');
  const options = choices(question);
  const selected = id(selectedChoiceId, 'selectedChoiceId');
  if (!options.has(selected)) throw new RangeError('selected choice is not in question');
  const key = id(attemptId, 'attemptId');
  if (history.attempts.some((a) => a.id === key)) throw new RangeError('duplicate attempt id');
  const correct = selected === question.correctChoiceId;
  const choice = question.choices.find((c) => c.id === selected);
  const attempt = {
    id: key, at: iso(at), questionId: question.id, questionRevision: question.revision,
    outcomeIds: [...question.outcomeIds], selectedChoiceId: selected,
    correctChoiceId: question.correctChoiceId, correct,
    ...(!correct && choice.misconceptionId ? { misconceptionId: choice.misconceptionId } : {})
  };
  return { history: { ...history, attempts: [...history.attempts, attempt] }, attempt };
}
/** Outcomes report: observed correctness only; version mismatch is explicitly surfaced. */
export function summarizeAssessments(core, history) {
  validateAssessmentHistory(history);
  const questions = questionIndex(core);
  const outcomes = new Map(core.outcomes.map((o) => [o.id, {
    outcomeId:o.id, attempts:0, correct:0, incorrect:0, misconceptionCounts:{}, mastery:null
  }]));
  const staleAttempts = [], orphanAttempts = [];
  for (const attempt of history.attempts) {
    const question = questions.get(attempt.questionId);
    if (!question || attempt.outcomeIds.some((o) => !outcomes.has(o))) {
      orphanAttempts.push(attempt.id); continue;
    }
    if (question.revision !== attempt.questionRevision ||
        question.correctChoiceId !== attempt.correctChoiceId ||
        JSON.stringify(question.outcomeIds) !== JSON.stringify(attempt.outcomeIds)) {
      staleAttempts.push(attempt.id);
      continue;
    }
    for (const outcomeId of attempt.outcomeIds) {
      const row = outcomes.get(outcomeId);
      row.attempts++;
      if (attempt.correct) row.correct++; else row.incorrect++;
      if (attempt.misconceptionId) {
        row.misconceptionCounts[attempt.misconceptionId] = (row.misconceptionCounts[attempt.misconceptionId] ?? 0) + 1;
      }
    }
  }
  return {
    outcomes: [...outcomes.values()],
    staleAttempts, orphanAttempts,
    disclaimer: 'Observed answer-key correctness is not proof of durable learning. Multi-outcome attempts share evidence.'
  };
}
