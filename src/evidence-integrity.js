/**
 * V4.3 cross-history integrity audit. Does not modify student records.
 * Fail-closed classifications are descriptive; they do not imply mastery.
 */
import {validateKnowledgeCore} from './knowledge-core.js';
import {validateAssessmentHistory} from './assessment.js';
import {validateTeachingHistory} from './learning-progress.js';

function isCurrent(a,q){
 return !!q&&q.revision===a.questionRevision&&q.correctChoiceId===a.correctChoiceId&&
 JSON.stringify(q.outcomeIds)===JSON.stringify(a.outcomeIds)&&
 Array.isArray(q.choices)&&q.choices.some(c=>c.id===a.selectedChoiceId)&&
 (a.correct||(q.choices.find(c=>c.id===a.selectedChoiceId)?.misconceptionId??null)===(a.misconceptionId??null));
}
function instant(value){
 if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new RangeError('invalid audit time');
 return Date.parse(value);
}
/**
 * Audit every attempt and completion against the *current* content revision,
 * answer choices, alignment, and a bounded observation time.
 */
export function auditLearningEvidence(core,assessments,teaching,{at}){
 validateKnowledgeCore(core);validateAssessmentHistory(assessments);validateTeachingHistory(teaching);
 const now=instant(at);
 const questions=new Map(core.questions.map(q=>[q.id,q]));
 const resources=new Map(core.resources.map(r=>[r.id,r]));
 const outcomes=new Set(core.outcomes.map(o=>o.id));
 const attempts=new Map(assessments.attempts.map(a=>[a.id,a]));
 const attemptRows=assessments.attempts.map(a=>{
  const problems=[];
  if(instant(a.at)>now)problems.push('future-attempt');
  if(!questions.has(a.questionId)||a.outcomeIds.some(id=>!outcomes.has(id)))problems.push('orphan-attempt');
  else if(!isCurrent(a,questions.get(a.questionId)))problems.push('stale-or-inconsistent-answer');
  return {attemptId:a.id,usable:problems.length===0,problems};
 });
 const accepted=new Set(attemptRows.filter(a=>a.usable).map(a=>a.attemptId));
 const completionRows=teaching.completions.map(c=>{
  const problems=[];
  const baseline=attempts.get(c.baselineAttemptId);
  const resource=resources.get(c.resourceId);
  if(instant(c.at)>now)problems.push('future-completion');
  if(!baseline)problems.push('missing-baseline');
  else {
   if(!accepted.has(baseline.id))problems.push('unusable-baseline');
   if(baseline.correct)problems.push('correct-baseline');
   if(instant(c.at)<instant(baseline.at))problems.push('completion-before-baseline');
  }
  if(!resource||resource.revision!==c.resourceRevision)problems.push('stale-or-missing-resource');
  else if(baseline){
   if(!resource.outcomeIds.some(id=>baseline.outcomeIds.includes(id)))problems.push('unaligned-resource');
   if(Array.isArray(resource.misconceptionIds)&&!resource.misconceptionIds.includes(baseline.misconceptionId))
    problems.push('unaligned-misconception');
  }
  return {completionId:c.id,usable:problems.length===0,problems};
 });
 const summary={attempts:attemptRows.length,usableAttempts:attemptRows.filter(a=>a.usable).length,
  completions:completionRows.length,usableCompletions:completionRows.filter(c=>c.usable).length};
 return {format:'fark-evidence-integrity',version:1,at:new Date(now).toISOString(),
  attempts:attemptRows,completions:completionRows,summary,
  safeForDescriptiveAnalysis:summary.attempts===summary.usableAttempts&&summary.completions===summary.usableCompletions,
  disclaimer:'A clean audit means records are structurally and temporally consistent with current editorial content, not authentic, independent, fair, or proof of learning.'};
}
