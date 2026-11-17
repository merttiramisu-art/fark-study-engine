/**
 * V3.1 resource progress + V3.4 bounded study plan + V3.5 honest evidence report.
 * Offline, deterministic, read-only except immutable completion-history append.
 */
import { validateKnowledgeCore } from './knowledge-core.js';
import { validateAssessmentHistory } from './assessment.js';
import { analyzeLearningGaps } from './prerequisite-analysis.js';

function id(x,name) { if(typeof x!=='string'||!x.trim())throw new TypeError(name+' must be nonempty');return x.trim(); }
function time(x,name) { const d=new Date(x);if(!Number.isFinite(d.getTime()))throw new RangeError('invalid '+name);return d.toISOString(); }
function positive(x,name) { if(!Number.isSafeInteger(x)||x<0)throw new RangeError(name+' must be a nonnegative safe integer');return x; }
function current(a,q) {return !!q && q.revision===a.questionRevision && q.correctChoiceId===a.correctChoiceId && JSON.stringify(q.outcomeIds)===JSON.stringify(a.outcomeIds);}
function index(core,history) {
 validateKnowledgeCore(core);validateAssessmentHistory(history);
 return {q:new Map(core.questions.map(x=>[x.id,x])),r:new Map(core.resources.map(x=>[x.id,x])),o:new Map(core.outcomes.map(x=>[x.id,x]))};
}
export function createTeachingHistory(){return {format:'fark-teaching-history',version:1,completions:[]};}
export function validateTeachingHistory(history){
 if(!history||history.format!=='fark-teaching-history'||history.version!==1||!Array.isArray(history.completions))throw new TypeError('invalid teaching history');
 const ids=new Set();
 for(const c of history.completions){
  id(c.id,'completion.id');id(c.resourceId,'completion.resourceId');id(c.resourceRevision,'completion.resourceRevision');id(c.baselineAttemptId,'completion.baselineAttemptId');
  time(c.at,'completion.at');
  if(ids.has(c.id))throw new RangeError('duplicate completion id');ids.add(c.id);
 }
 return history;
}
/** Caller-reported completion, not proof of reading, understanding or efficacy. */
export function recordTeachingCompletion(core,assessments,teaching,{completionId,resourceId,baselineAttemptId,at}){
 const {q,r}=index(core,assessments);validateTeachingHistory(teaching);
 const baseline=assessments.attempts.find(x=>x.id===id(baselineAttemptId,'baselineAttemptId'));
 const resource=r.get(id(resourceId,'resourceId'));
 if(!baseline||!resource)throw new RangeError('unknown baseline or resource');
 if(baseline.correct||!current(baseline,q.get(baseline.questionId)))throw new RangeError('baseline must be current and incorrect');
 if(!resource.outcomeIds.some(x=>baseline.outcomeIds.includes(x)))throw new RangeError('resource not aligned with baseline');
 if(Array.isArray(resource.misconceptionIds)&&(!baseline.misconceptionId||!resource.misconceptionIds.includes(baseline.misconceptionId)))throw new RangeError('resource misconception does not match baseline');
 if(Date.parse(time(at,'completion.at'))<Date.parse(baseline.at))throw new RangeError('completion before baseline');
 const key=id(completionId,'completionId');
 if(teaching.completions.some(x=>x.id===key))throw new RangeError('duplicate completion id');
 const completion={id:key,resourceId:resource.id,resourceRevision:resource.revision,baselineAttemptId:baseline.id,at:time(at,'completion.at')};
 return {history:{...teaching,completions:[...teaching.completions,completion]},completion};
}
function evidence(core,assessments,teaching,at){
 const {q,r}=index(core,assessments);validateTeachingHistory(teaching);
 const now=Date.parse(time(at,'at'));
 const stats=new Map(core.outcomes.map(x=>[x.id,{outcomeId:x.id,label:x.label,attempts:0,correct:0,incorrect:0,latestAt:null,misconceptionCounts:{},teachingCompletions:0,mastery:null}]));
 const excluded={staleAttempts:[],futureAttempts:[],orphanAttempts:[],staleCompletions:[],futureCompletions:[]};
 for(const a of assessments.attempts){
  if(Date.parse(a.at)>now){excluded.futureAttempts.push(a.id);continue;}
  const question=q.get(a.questionId);
  if(!question||a.outcomeIds.some(x=>!stats.has(x))){excluded.orphanAttempts.push(a.id);continue;}
  if(!current(a,question)){excluded.staleAttempts.push(a.id);continue;}
  for(const oid of a.outcomeIds){
   const s=stats.get(oid);s.attempts++;s[a.correct?'correct':'incorrect']++;
   if(!s.latestAt||Date.parse(a.at)>Date.parse(s.latestAt))s.latestAt=a.at;
   if(!a.correct&&a.misconceptionId)s.misconceptionCounts[a.misconceptionId]=(s.misconceptionCounts[a.misconceptionId]??0)+1;
  }
 }
 for(const c of teaching.completions){
  if(Date.parse(c.at)>now){excluded.futureCompletions.push(c.id);continue;}
  const baseline=assessments.attempts.find(x=>x.id===c.baselineAttemptId),resource=r.get(c.resourceId);
  if(!baseline||!resource||resource.revision!==c.resourceRevision||!current(baseline,q.get(baseline.questionId))||baseline.correct||Date.parse(baseline.at)>Date.parse(c.at)||Date.parse(baseline.at)>now||
   !resource.outcomeIds.some(x=>baseline.outcomeIds.includes(x))||
   (Array.isArray(resource.misconceptionIds)&&!resource.misconceptionIds.includes(baseline.misconceptionId))){excluded.staleCompletions.push(c.id);continue;}
  for(const oid of resource.outcomeIds.filter(x=>baseline.outcomeIds.includes(x)))stats.get(oid).teachingCompletions++;
 }
 return {outcomes:[...stats.values()],excluded};
}
/** V3.5: descriptive observations, explicit exclusions, never mastery estimates. */
export function getLearningEvidenceReport(core,assessments,teaching,{at}){
 const report=evidence(core,assessments,teaching,at);
 return {...report,totals:{attempts:report.outcomes.reduce((n,x)=>n+x.attempts,0),correct:report.outcomes.reduce((n,x)=>n+x.correct,0),incorrect:report.outcomes.reduce((n,x)=>n+x.incorrect,0)},
  disclaimer:'Counts are outcome attributions, not independent tests; resource completion is self-reported, correctness is not durable mastery, and no causal learning effect is inferred.'};
}
/** V3.4: finite, explainable outcome plan from observed incorrect answers; no artificial mastery or due dates. */
export function planPersonalStudy(core,assessments,teaching,{at,limit=5,maxPerUnit=3,includePrerequisites=false}){
 if(typeof includePrerequisites!=='boolean')throw new TypeError('includePrerequisites must be boolean');
 positive(limit,'limit');positive(maxPerUnit,'maxPerUnit');
 const report=evidence(core,assessments,teaching,at);
 const units=new Map(core.outcomes.map(x=>[x.id,x.unitId]));
 const counts=new Map(),planned=[];
 const analysis=includePrerequisites?analyzeLearningGaps(core,assessments,{at}):null;
 const findings=new Map(analysis?.outcomes.map(row=>[row.outcomeId,row])??[]);
 const candidates=report.outcomes.filter(x=>x.incorrect>0).sort((a,b)=>
  (b.incorrect-a.incorrect)||(b.attempts-a.attempts)||(a.outcomeId<b.outcomeId?-1:a.outcomeId>b.outcomeId?1:0));
 for(const row of candidates){
  if(planned.length>=limit)break;
  const unitId=units.get(row.outcomeId);
  if((counts.get(unitId)??0)>=maxPerUnit)continue;
  const resources=core.resources.filter(r=>r.outcomeIds.includes(row.outcomeId)&&!Array.isArray(r.misconceptionIds)).sort((a,b)=>a.id.localeCompare(b.id));
  const questions=core.questions.filter(q=>q.outcomeIds.includes(row.outcomeId)&&Array.isArray(q.choices)&&q.choices.some(c=>c.id===q.correctChoiceId)&&
   !assessments.attempts.some(a=>a.questionId===q.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const finding=findings.get(row.outcomeId);
  const suggestedPrerequisites=finding?.prerequisites.filter(p=>p.incorrect>0).map(p=>p.outcomeId)??[];
  const observedPatterns=finding?.misconceptionPatterns.filter(p=>p.evidenceLevel==='repeated-observation').map(p=>p.misconceptionId)??[];
  planned.push({outcomeId:row.outcomeId,unitId,observedIncorrect:row.incorrect,observedAttempts:row.attempts,
   ...(includePrerequisites?{suggestedPrerequisites,observedPatterns,explanation: finding?.hypotheses??[]}:{}),
   resourceIds:resources.map(r=>r.id),unseenQuestionId:questions[0]?.id??null,
   reasonCodes:['observed-incorrect-answers',...(suggestedPrerequisites.length?['observed-prerequisite-difficulty']:[]),...(observedPatterns.length?['repeated-editorial-distractor-pattern']:[]),...(row.teachingCompletions?['reported-teaching-completion']:[]),...(!questions.length?['no-unseen-question']:[])]});
  counts.set(unitId,(counts.get(unitId)??0)+1);
 }
 return {planned,plannedCount:planned.length,deferredCount:candidates.length-planned.length,
  excluded:report.excluded,disclaimer:'Prioritization uses observed errors, not mastery, ability, or a scientifically calibrated review interval.'};
}
