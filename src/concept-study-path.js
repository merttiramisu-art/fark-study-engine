/**
 * FARK Concept Study Path V1 — read-only, deterministic explanation of the
 * next possible action for ONE explicitly selected curriculum outcome.
 * Never diagnoses mastery, invents activity or claims causal improvement.
 */
import { buildConceptMap } from './concept-map.js';
import { validateAssessmentHistory } from './assessment.js';
import { validateTeachingHistory } from './learning-progress.js';
import { getLearningNextStep } from './learning-orchestrator.js';

function timestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new RangeError('invalid concept path timestamp');
  }
  return Date.parse(value);
}

function currentAttempt(core, attempt) {
  const question = core.questions.find(row => row.id === attempt.questionId);
  return !!question && question.revision === attempt.questionRevision &&
    question.correctChoiceId === attempt.correctChoiceId &&
    JSON.stringify(question.outcomeIds) === JSON.stringify(attempt.outcomeIds) &&
    question.choices?.some(choice => choice.id === attempt.selectedChoiceId) &&
    (attempt.correct || (question.choices.find(choice =>
      choice.id === attempt.selectedChoiceId)?.misconceptionId ?? null) ===
      (attempt.misconceptionId ?? null));
}

/**
 * Read-only next step. The most RECENT current observation for the selected
 * outcome takes precedence. A later correct observation never causes an
 * invented remedial lesson from an older wrong answer. Prerequisite statuses
 * are descriptive, not enrollment gates.
 */
export function getConceptStudyPath(core, assessments, teaching, { outcomeId, at }) {
  const now = timestamp(at);
  validateAssessmentHistory(assessments);
  validateTeachingHistory(teaching);
  const currentHistory = {
    ...assessments,
    attempts: assessments.attempts.filter(a => timestamp(a.at) <= now)
  };
  const map = buildConceptMap(core, currentHistory);
  if (typeof outcomeId !== 'string' || !outcomeId.trim()) {
    throw new TypeError('outcomeId must be nonempty');
  }
  const selected = map.nodes.find(node => node.id === outcomeId);
  if (!selected) throw new RangeError('unknown concept outcome');
  const prerequisites = selected.prerequisiteIds.map(id => {
    const item = map.nodes.find(node => node.id === id);
    return {
      outcomeId: item.id, label: item.label,
      status: item.status, observedAttempts: item.attempts,
      mastery: null
    };
  });
  const observations = currentHistory.attempts
    .filter(a => a.outcomeIds.includes(outcomeId) && currentAttempt(core, a))
    .sort((a, b) => timestamp(b.at) - timestamp(a.at) || b.id.localeCompare(a.id, 'en'));
  const latest = observations[0] ?? null;
  const unseen = core.questions
    .filter(q => q.outcomeIds.includes(outcomeId) &&
      !assessments.attempts.some(a => a.questionId === q.id))
    .sort((a, b) => a.id.localeCompare(b.id, 'en'))[0];
  const common = {
    format:'fark-concept-study-path', version:1, outcomeId:selected.id,
    outcomeLabel:selected.label, prerequisites, latestAttemptId:latest?.id ?? null,
    latestCorrect:latest?.correct ?? null, mastery:null,
    ignoredFutureAttemptIds:assessments.attempts
      .filter(a => timestamp(a.at) > now).map(a => a.id),
    disclaimer:'These are observed answer-key results and editorial content links, not a diagnosis or proof of durable learning. Prerequisites are authored connections, not access restrictions.'
  };
  if (!latest) return {
    ...common, status:unseen?'first-question':'no-question',
    nextAction:unseen?'answer-question':'editorial-review',
    questionId:unseen?.id ?? null, resourceId:null,
    reason:unseen
      ? 'No valid answer recorded for this concept. An unanswered editorial question can establish the first observation.'
      : 'No valid answer recorded and no unanswered question available; the author needs to provide one.'
  };
  if (latest.correct) return {
    ...common, status:'latest-correct', nextAction:'review-observation',
    questionId:null, resourceId:null,
    reason:'The most recent current answer for this concept was correct. No remedial need is inferred; one answer is not mastery.'
  };
  const step = getLearningNextStep(core, currentHistory, teaching, {
    at:new Date(now).toISOString(), baselineAttemptId:latest.id, outcomeId
  });
  const status = step.status;
  const resourceId = status === 'teaching-needed'
    ? step.resources[0]?.resourceId ?? null : null;
  return {
    ...common, status, nextAction:step.nextAction,
    baselineAttemptId:latest.id,
    resourceId, questionId:step.questionId ?? null,
    reason: status === 'teaching-needed'
      ? 'A current incorrect answer is linked to this editorial lesson; reading and understanding are not assumed.'
      : status === 'ready-to-reassess'
        ? 'A lesson-review completion was self-reported. A different question may now be explicitly issued.'
        : status === 'reassessment-observed'
          ? 'A later different-question response was observed. This is not proof of explicit issuance or mastery.'
          : status === 'no-teaching-resource'
            ? 'An incorrect answer is observed, but no matching editorial lesson is available.'
            : status === 'no-reassessment-question'
              ? 'A lesson review was reported, but no unused different question is available.'
              : 'The observation cannot support an automatic next learning step; review the evidence.',
    orchestrationStatus:status
  };
}
