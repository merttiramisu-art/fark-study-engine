/**
 * V4: read-only, deterministic orchestration of existing learning APIs.
 * The application records answers and lesson completions; this module never
 * invents user events, content, diagnoses, or mastery.
 */
import { validateKnowledgeCore } from './knowledge-core.js';
import { validateAssessmentHistory } from './assessment.js';
import { validateTeachingHistory, planPersonalStudy, getLearningEvidenceReport } from './learning-progress.js';
import { analyzeLearningGaps } from './prerequisite-analysis.js';
import { planRemediation, planReassessment, compareReassessment } from './learning-loop.js';

function requiredId(value, field) {
  if(typeof value!=='string'||!value.trim())throw new TypeError(field+' must be nonempty');
  return value.trim();
}
function timestamp(value) {
  const n=Date.parse(value);
  if(!Number.isFinite(n))throw new RangeError('invalid at timestamp');
  return n;
}
function currentAttempt(core, attempt) {
  const q=core.questions.find(q=>q.id===attempt.questionId);
  return !!q&&q.revision===attempt.questionRevision&&q.correctChoiceId===attempt.correctChoiceId&&
    JSON.stringify(q.outcomeIds)===JSON.stringify(attempt.outcomeIds)&&
    Array.isArray(q.choices)&&q.choices.some(c=>c.id===attempt.selectedChoiceId)&&
    (attempt.correct || (q.choices.find(c=>c.id===attempt.selectedChoiceId)?.misconceptionId??null)===(attempt.misconceptionId??null));
}
function validCompletion(core,baseline,c,now) {
  const resource=core.resources.find(r=>r.id===c.resourceId);
  return !!resource&&resource.revision===c.resourceRevision&&
    resource.outcomeIds.some(o=>baseline.outcomeIds.includes(o))&&
    (!Array.isArray(resource.misconceptionIds)||resource.misconceptionIds.includes(baseline.misconceptionId))&&
    timestamp(c.at)>=timestamp(baseline.at)&&timestamp(c.at)<=now;
}
/**
 * Select one observed incorrect baseline and return its next safe action.
 * Selection is explicit: no automatic inference of what a student should do.
 * Requires a completion event before issuing a reassessment question.
 */
export function getLearningNextStep(core, assessments, teaching, {at, baselineAttemptId, outcomeId}) {
  validateKnowledgeCore(core);validateAssessmentHistory(assessments);validateTeachingHistory(teaching);
  const now=timestamp(at);
  const baseline=assessments.attempts.find(a=>a.id===requiredId(baselineAttemptId,'baselineAttemptId'));
  const outcome=requiredId(outcomeId,'outcomeId');
  if(!baseline)throw new RangeError('unknown baseline');
  if(baseline.correct)throw new RangeError('baseline must be incorrect');
  if(!baseline.outcomeIds.includes(outcome))throw new RangeError('outcome not linked to baseline');
  if(timestamp(baseline.at)>now)return {status:'future-baseline',nextAction:'review-evidence',outcomeId:outcome,mastery:null};
  if(!currentAttempt(core,baseline))return {status:'stale-baseline',nextAction:'review-evidence',outcomeId:outcome,mastery:null};

  const completions=teaching.completions.filter(c=>c.baselineAttemptId===baseline.id&&
    validCompletion(core,baseline,c,now)).sort((a,b)=>timestamp(a.at)-timestamp(b.at)||a.id.localeCompare(b.id));
  if(!completions.length) {
    const remediation=planRemediation(core,assessments,{attemptId:baseline.id});
    const resources=remediation.recommendations.find(r=>r.outcomeId===outcome)?.resources??[];
    return {status:resources.length?'teaching-needed':'no-teaching-resource',
      nextAction:resources.length?'present-teaching':'editorial-review',
      outcomeId:outcome,baselineAttemptId:baseline.id,resources,
      completionRequired:true,mastery:null};
  }
  const completedAt=timestamp(completions[0].at);
  // Reassessment must occur after the *recorded* completion, on a different question.
  const followups=assessments.attempts.filter(a=>a.id!==baseline.id&&a.questionId!==baseline.questionId&&
    a.outcomeIds.includes(outcome)&&timestamp(a.at)>completedAt&&timestamp(a.at)<=now&&
    currentAttempt(core,a)).sort((a,b)=>timestamp(a.at)-timestamp(b.at)||a.id.localeCompare(b.id));
  if(followups.length) {
    const followup=followups[0];
    const comparison=compareReassessment(core,assessments,{
      baselineAttemptId:baseline.id,followupAttemptId:followup.id,outcomeId:outcome
    });
    return {status:'reassessment-observed',nextAction:'review-evidence',outcomeId:outcome,
      baselineAttemptId:baseline.id,completionIds:completions.map(c=>c.id),
      followupAttemptId:followup.id,comparison,mastery:null};
  }
  const next=planReassessment(core,assessments,{attemptId:baseline.id,outcomeId:outcome});
  return {status:next.status==='ready'?'ready-to-reassess':'no-reassessment-question',
    nextAction:next.status==='ready'?'present-reassessment':'editorial-review',
    outcomeId:outcome,baselineAttemptId:baseline.id,completionIds:completions.map(c=>c.id),
    questionId:next.questionId,questionRevision:next.questionRevision??null,mastery:null};
}
/** One consistent snapshot of V3.3 analysis, V3.4 plan and V3.5 evidence. */
export function getLearningDashboard(core,assessments,teaching,{at,limit=5,maxPerUnit=3}){
  validateKnowledgeCore(core);validateAssessmentHistory(assessments);validateTeachingHistory(teaching);
  const now=new Date(timestamp(at)).toISOString();
  const gaps=analyzeLearningGaps(core,assessments,{at:now});
  const plan=planPersonalStudy(core,assessments,teaching,{at:now,limit,maxPerUnit,includePrerequisites:true});
  const evidence=getLearningEvidenceReport(core,assessments,teaching,{at:now});
  return {at:now,gaps,plan,evidence,mastery:null,
    disclaimer:'Orchestration is a descriptive workflow, not verified lesson engagement, causal teaching impact or durable mastery.'};
}
