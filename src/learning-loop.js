/**
 * V3.1–V3.2: deterministic, offline, content-agnostic teaching/reassessment workflow.
 * A suggested resource is an editorial match, not proof of effectiveness.
 */
import { validateKnowledgeCore } from './knowledge-core.js';
import { validateAssessmentHistory } from './assessment.js';

function nonempty(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(field + ' must be nonempty');
  return value.trim();
}
function indexed(core, history) {
  validateKnowledgeCore(core);
  validateAssessmentHistory(history);
  return {
    questions: new Map(core.questions.map(q => [q.id, q])),
    outcomes: new Map(core.outcomes.map(o => [o.id, o]))
  };
}
function isCurrent(attempt, question) {
  return !!question && question.revision === attempt.questionRevision &&
    question.correctChoiceId === attempt.correctChoiceId &&
    JSON.stringify(question.outcomeIds) === JSON.stringify(attempt.outcomeIds);
}
function validAttempt(attempt, questions, outcomes) {
  const question = questions.get(attempt.questionId);
  return isCurrent(attempt, question) && attempt.outcomeIds.every(id => outcomes.has(id));
}
function validResource(resource, outcomeId, misconceptionId) {
  if (!resource.outcomeIds.includes(outcomeId)) return false;
  // A misconception-specific resource must match the observed distractor tag.
  return !Array.isArray(resource.misconceptionIds) ||
    (misconceptionId != null && resource.misconceptionIds.includes(misconceptionId));
}
/**
 * Select a lesson for a particular observed incorrect answer.
 * Does not expose lesson text or choose content based on unsupported inference.
 */
export function planRemediation(core, history, { attemptId }) {
  const { questions, outcomes } = indexed(core, history);
  const attempt = history.attempts.find(a => a.id === nonempty(attemptId, 'attemptId'));
  if (!attempt) throw new RangeError('unknown attempt');
  if (attempt.correct) throw new RangeError('remediation requires an incorrect answer');
  if (!validAttempt(attempt, questions, outcomes)) {
    return { status:'stale-evidence', attemptId:attempt.id, recommendations:[] };
  }
  const recommendations = [];
  for (const outcomeId of attempt.outcomeIds) {
    const resources = core.resources
      .filter(r => validResource(r, outcomeId, attempt.misconceptionId))
      .sort((a,b) => {
        // Specific editorial material precedes generic material; deterministic ID tie-break.
        const specificity = Number(Array.isArray(b.misconceptionIds)) - Number(Array.isArray(a.misconceptionIds));
        return specificity || a.id.localeCompare(b.id);
      })
      .map(r => ({resourceId:r.id, resourceRevision:r.revision, kind:r.kind}));
    recommendations.push({outcomeId, misconceptionId:attempt.misconceptionId ?? null, resources});
  }
  return {
    status:recommendations.some(r => r.resources.length) ? 'ready' : 'no-matching-resource',
    attemptId:attempt.id, questionId:attempt.questionId, recommendations,
    rationale:'Editorial resource links to outcomes and possible distractor misconceptions; no diagnosis or mastery inference.'
  };
}
/**
 * Find a distinct, aligned question for a post-teaching check.
 * Excludes the original question and all questions already answered in the supplied history.
 * The caller controls when teaching happened and when this check is administered.
 */
export function planReassessment(core, history, { attemptId, outcomeId }) {
  const { questions, outcomes } = indexed(core, history);
  const attempt = history.attempts.find(a => a.id === nonempty(attemptId, 'attemptId'));
  if (!attempt) throw new RangeError('unknown attempt');
  if (attempt.correct) throw new RangeError('reassessment requires an incorrect baseline');
  if (!validAttempt(attempt, questions, outcomes)) return {status:'stale-evidence',questionId:null};
  const outcome = nonempty(outcomeId, 'outcomeId');
  if (!attempt.outcomeIds.includes(outcome)) throw new RangeError('outcome not linked to baseline');
  const answered = new Set(history.attempts.map(a => a.questionId));
  const candidates = core.questions.filter(q =>
    q.id !== attempt.questionId && !answered.has(q.id) &&
    q.outcomeIds.includes(outcome) &&
    Array.isArray(q.choices) && q.choices.length >= 2 &&
    typeof q.correctChoiceId === 'string' &&
    q.choices.some(c => c.id === q.correctChoiceId)
  ).sort((a,b) => a.id.localeCompare(b.id));
  if (!candidates.length) return {status:'no-independent-question',questionId:null,outcomeId:outcome};
  return {status:'ready',questionId:candidates[0].id,questionRevision:candidates[0].revision,
    outcomeId:outcome, baselineAttemptId:attempt.id,
    rationale:'Different question ID aligned to the same outcome; not a calibrated or independent mastery estimate.'};
}
/**
 * Compare a baseline and a later answer. Does not assert that teaching caused the change.
 * Same-outcome comparison requires both answers be current and from different questions.
 */
export function compareReassessment(core, history, { baselineAttemptId, followupAttemptId, outcomeId }) {
  const { questions, outcomes } = indexed(core, history);
  const baseline = history.attempts.find(a => a.id === nonempty(baselineAttemptId,'baselineAttemptId'));
  const followup = history.attempts.find(a => a.id === nonempty(followupAttemptId,'followupAttemptId'));
  if (!baseline || !followup) throw new RangeError('unknown assessment attempt');
  const outcome = nonempty(outcomeId,'outcomeId');
  if (!outcomes.has(outcome) || !baseline.outcomeIds.includes(outcome) || !followup.outcomeIds.includes(outcome)) {
    throw new RangeError('attempts do not share requested outcome');
  }
  if (baseline.correct) throw new RangeError('baseline must be incorrect');
  if (baseline.questionId === followup.questionId) throw new RangeError('reassessment must use a different question');
  if (!validAttempt(baseline, questions, outcomes) || !validAttempt(followup, questions, outcomes)) {
    return {status:'stale-evidence',outcomeId:outcome,mastery:null};
  }
  if (Date.parse(followup.at) <= Date.parse(baseline.at)) throw new RangeError('followup must be later than baseline');
  return {
    status:'observed', outcomeId:outcome,
    baselineAttemptId:baseline.id, followupAttemptId:followup.id,
    baselineCorrect:false, followupCorrect:followup.correct,
    elapsedMs:Date.parse(followup.at)-Date.parse(baseline.at),
    mastery:null,
    interpretation:followup.correct ? 'correct-on-distinct-followup-question' : 'incorrect-on-distinct-followup-question',
    disclaimer:'Two answers cannot establish durable learning or causal impact of teaching.'
  };
}
