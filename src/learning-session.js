/**
 * V4.1 portable learning-session snapshots and safe resume.
 * Caller owns durable storage; snapshots are NOT tamper-proof or encrypted.
 */
import {validateKnowledgeCore} from './knowledge-core.js';
import {validateAssessmentHistory} from './assessment.js';
import {validateTeachingHistory} from './learning-progress.js';
import {getLearningNextStep} from './learning-orchestrator.js';

function nonempty(value,field) {
 if(typeof value!=='string'||!value.trim())throw new TypeError(field+' must be nonempty');
 return value.trim();
}
function date(value,field) {
 if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new RangeError('invalid '+field);
 return new Date(value).toISOString();
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function assertSession(session) {
 if(!session||session.format!=='fark-learning-session'||session.version!==1)throw new TypeError('invalid learning session');
 for(const key of ['sessionId','baselineAttemptId','outcomeId','baselineQuestionId','baselineQuestionRevision'])
  nonempty(session[key],key);
 date(session.createdAt,'createdAt');
 validateAssessmentHistory(session.assessments);
 validateTeachingHistory(session.teaching);
 if(!session.assessments.attempts.some(a=>a.id===session.baselineAttemptId))throw new RangeError('baseline absent from snapshot');
 const baseline=session.assessments.attempts.find(a=>a.id===session.baselineAttemptId);
 if(baseline.correct||baseline.questionId!==session.baselineQuestionId||baseline.questionRevision!==session.baselineQuestionRevision||
    !baseline.outcomeIds.includes(session.outcomeId))throw new RangeError('inconsistent session baseline');
 return session;
}
/** Freeze an auditable baseline plus immutable event-history snapshots. */
export function createLearningSession(core,assessments,teaching,{sessionId,baselineAttemptId,outcomeId,at}){
 validateKnowledgeCore(core);validateAssessmentHistory(assessments);validateTeachingHistory(teaching);
 const baseline=assessments.attempts.find(a=>a.id===nonempty(baselineAttemptId,'baselineAttemptId'));
 if(!baseline||baseline.correct||!baseline.outcomeIds.includes(nonempty(outcomeId,'outcomeId')))throw new RangeError('invalid incorrect baseline/outcome');
 const createdAt=date(at,'at');
 if(Date.parse(baseline.at)>Date.parse(createdAt))throw new RangeError('future baseline');
 const next=getLearningNextStep(core,assessments,teaching,{at:createdAt,baselineAttemptId,outcomeId});
 if(['stale-baseline','future-baseline'].includes(next.status))throw new RangeError('cannot checkpoint stale baseline');
 const session={format:'fark-learning-session',version:1,sessionId:nonempty(sessionId,'sessionId'),
  createdAt,baselineAttemptId:baseline.id,outcomeId,baselineQuestionId:baseline.questionId,
  baselineQuestionRevision:baseline.questionRevision,assessments:clone(assessments),teaching:clone(teaching)};
 return assertSession(session);
}
/** Decode untrusted JSON defensively; no persistence, no unsafe eval. */
export function parseLearningSession(json){
 if(typeof json!=='string'||json.length>2_000_000)throw new RangeError('invalid session JSON length');
 let parsed;
 try{parsed=JSON.parse(json);}catch{throw new TypeError('malformed session JSON');}
 return clone(assertSession(parsed));
}
export function serializeLearningSession(session){return JSON.stringify(assertSession(session));}
/**
 * Reconcile externally persisted event histories with checkpoint:
 * no previously recorded event may be removed or changed.
 * A conflicting snapshot is blocked rather than silently overwritten.
 */
export function resumeLearningSession(core,session,{at,assessments=session.assessments,teaching=session.teaching}={}){
 validateKnowledgeCore(core);assertSession(session);
 validateAssessmentHistory(assessments);validateTeachingHistory(teaching);
 const now=date(at,'at');
 if(Date.parse(now)<Date.parse(session.createdAt))throw new RangeError('resume before checkpoint');
 for(const [key,prior,latest] of [['assessment',session.assessments.attempts,assessments.attempts],['teaching',session.teaching.completions,teaching.completions]]){
  const byId=new Map(latest.map(event=>[event.id,event]));
  for(const event of prior){
   const updated=byId.get(event.id);
   if(!updated||JSON.stringify(updated)!==JSON.stringify(event))throw new RangeError('conflicting '+key+' history');
  }
 }
 const step=getLearningNextStep(core,assessments,teaching,{
  at:now,baselineAttemptId:session.baselineAttemptId,outcomeId:session.outcomeId
 });
 return {sessionId:session.sessionId,at:now,step,assessments:clone(assessments),teaching:clone(teaching),
  warning:'Session snapshots are not authenticated or encrypted; host must protect storage and student identity.'};
}
