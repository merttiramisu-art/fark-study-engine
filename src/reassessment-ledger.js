/**
 * V4.4 explicit reassessment issuance ledger.
 * Binds a follow-up answer to an actually issued question, rather than
 * attributing any later answer to the teaching workflow.
 */
import {validateKnowledgeCore} from './knowledge-core.js';
import {validateAssessmentHistory} from './assessment.js';
import {validateTeachingHistory} from './learning-progress.js';
import {getLearningNextStep} from './learning-orchestrator.js';
import {compareReassessment} from './learning-loop.js';

const id=(value,name)=>{if(typeof value!=='string'||!value.trim())throw new TypeError(name+' must be nonempty');return value.trim();};
const time=(value)=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new RangeError('invalid issuance time');return new Date(value).toISOString();};
export function createReassessmentLedger(){return {format:'fark-reassessment-ledger',version:1,issues:[]};}
export function validateReassessmentLedger(ledger){
 if(!ledger||ledger.format!=='fark-reassessment-ledger'||ledger.version!==1||!Array.isArray(ledger.issues))throw new TypeError('invalid reassessment ledger');
 const ids=new Set(),questions=new Set();
 for(const issue of ledger.issues){
  for(const key of ['id','baselineAttemptId','outcomeId','questionId','questionRevision'])id(issue[key],key);
  time(issue.issuedAt);
  if(ids.has(issue.id))throw new RangeError('duplicate issue id');
  ids.add(issue.id);
  if(questions.has(issue.questionId))throw new RangeError('question already issued');
  questions.add(issue.questionId);
 }
 return ledger;
}
/** Issue a new, never-answered question only after aligned teaching. */
export function issueReassessment(core,assessments,teaching,ledger,{issueId,baselineAttemptId,outcomeId,at}){
 validateKnowledgeCore(core);validateAssessmentHistory(assessments);validateTeachingHistory(teaching);validateReassessmentLedger(ledger);
 const issuedAt=time(at);
 const key=id(issueId,'issueId');
 if(ledger.issues.some(i=>i.id===key))throw new RangeError('duplicate issue id');
 const step=getLearningNextStep(core,assessments,teaching,{at:issuedAt,baselineAttemptId,outcomeId});
 if(step.status!=='ready-to-reassess')return {status:step.status,ledger,issue:null};
 const alreadyIssued=new Set(ledger.issues.map(i=>i.questionId));
 const used=new Set(assessments.attempts.map(a=>a.questionId));
 const baseline=assessments.attempts.find(a=>a.id===baselineAttemptId);
 const candidates=core.questions.filter(q=>q.id!==baseline.questionId&&q.outcomeIds.includes(outcomeId)&&
  !used.has(q.id)&&!alreadyIssued.has(q.id)&&Array.isArray(q.choices)&&q.choices.length>=2&&
  q.choices.some(c=>c.id===q.correctChoiceId)).sort((a,b)=>a.id.localeCompare(b.id));
 if(!candidates.length)return {status:'no-unissued-question',ledger,issue:null};
 const question=candidates[0];
 const issue={id:key,baselineAttemptId,outcomeId,questionId:question.id,questionRevision:question.revision,issuedAt};
 return {status:'issued',ledger:{...ledger,issues:[...ledger.issues,issue]},issue};
}
/** Only a response to the issued question, after issuance, can be compared. */
export function verifyIssuedReassessment(core,assessments,ledger,{issueId,followupAttemptId,at}){
 validateKnowledgeCore(core);validateAssessmentHistory(assessments);validateReassessmentLedger(ledger);
 const now=Date.parse(time(at));
 const issue=ledger.issues.find(i=>i.id===id(issueId,'issueId'));
 if(!issue)throw new RangeError('unknown issue');
 const answer=assessments.attempts.find(a=>a.id===id(followupAttemptId,'followupAttemptId'));
 if(!answer)throw new RangeError('unknown followup attempt');
 if(answer.questionId!==issue.questionId||answer.questionRevision!==issue.questionRevision)
  return {status:'unmatched-issued-question',issueId:issue.id,mastery:null};
 if(Date.parse(answer.at)<=Date.parse(issue.issuedAt)||Date.parse(answer.at)>now)
  return {status:'outside-issuance-window',issueId:issue.id,mastery:null};
 const firstAnswer=assessments.attempts.filter(a=>a.questionId===issue.questionId&&Date.parse(a.at)>Date.parse(issue.issuedAt))\n  .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.id.localeCompare(b.id))[0];\n if(firstAnswer?.id!==answer.id)return {status:'not-first-issued-response',issueId:issue.id,mastery:null};\n const other=ledger.issues.some(i=>i.id!==issue.id&&i.questionId===answer.questionId);
 if(other)return {status:'ambiguous-issuance',issueId:issue.id,mastery:null};
 const comparison=compareReassessment(core,assessments,{baselineAttemptId:issue.baselineAttemptId,
  followupAttemptId:answer.id,outcomeId:issue.outcomeId});
 return {status:comparison.status==='observed'?'verified-issued-answer':'stale-evidence',
  issueId:issue.id,followupAttemptId:answer.id,comparison,mastery:null};
}
