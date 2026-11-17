import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentHistory,recordAssessment} from '../src/assessment.js';
import {createTeachingHistory,recordTeachingCompletion} from '../src/learning-progress.js';
import {createReassessmentLedger,issueReassessment,verifyIssuedReassessment} from '../src/reassessment-ledger.js';
const core={format:'fark-knowledge-core',version:1,units:[{id:'u',label:'Unit'}],
 outcomes:[{id:'o',unitId:'u',label:'Outcome'}],resources:[{id:'r',kind:'lesson',revision:'1',outcomeIds:['o']}],
 questions:[{id:'q1',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
 {id:'q2',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
 {id:'q3',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]}],mappings:[]};
const answer=(history,attemptId,questionId,selectedChoiceId,at)=>
 recordAssessment(core,history,{attemptId,questionId,selectedChoiceId,at}).history;
const a=answer(createAssessmentHistory(),'a1','q1','b','2026-01-01T10:00:00Z');
const t=recordTeachingCompletion(core,a,createTeachingHistory(),{completionId:'c1',resourceId:'r',baselineAttemptId:'a1',at:'2026-01-01T11:00:00Z'}).history;
const opts={issueId:'i1',baselineAttemptId:'a1',outcomeId:'o',at:'2026-01-01T12:00:00Z'};
test('V4.4 requires a teaching completion before issuing',()=>{
 const result=issueReassessment(core,a,createTeachingHistory(),createReassessmentLedger(),opts);
 assert.equal(result.status,'teaching-needed');
 assert.equal(result.issue,null);
});
test('V4.4 issues once and verifies only first post-issuance answer',()=>{
 const issued=issueReassessment(core,a,t,createReassessmentLedger(),opts);
 assert.equal(issued.status,'issued');
 assert.equal(issued.issue.questionId,'q2');
 const answered=answer(a,'a2','q2','a','2026-01-01T12:01:00Z');
 const verified=verifyIssuedReassessment(core,answered,issued.ledger,{issueId:'i1',followupAttemptId:'a2',at:'2026-01-01T13:00:00Z'});
 assert.equal(verified.status,'verified-issued-answer');
 assert.equal(verified.comparison.followupCorrect,true);
 assert.equal(verified.mastery,null);
 const replay=answer(answered,'a3','q2','b','2026-01-01T12:02:00Z');
 assert.equal(verifyIssuedReassessment(core,replay,issued.ledger,{issueId:'i1',followupAttemptId:'a3',at:'2026-01-01T13:00:00Z'}).status,'not-first-issued-response');
});
test('V4.4 refuses unrelated or pre-issued answers and reuses no question',()=>{
 const issued=issueReassessment(core,a,t,createReassessmentLedger(),opts);
 const unrelated=answer(a,'a2','q3','a','2026-01-01T12:01:00Z');
 assert.equal(verifyIssuedReassessment(core,unrelated,issued.ledger,{issueId:'i1',followupAttemptId:'a2',at:'2026-01-01T13:00:00Z'}).status,'unmatched-issued-question');
 const early=answer(a,'a3','q2','a','2026-01-01T11:30:00Z');
 assert.equal(verifyIssuedReassessment(core,early,issued.ledger,{issueId:'i1',followupAttemptId:'a3',at:'2026-01-01T13:00:00Z'}).status,'outside-issuance-window');
 const again=issueReassessment(core,a,t,issued.ledger,{...opts,issueId:'i2'});
 assert.equal(again.issue.questionId,'q3');
 assert.equal(issued.ledger.issues.length,1);
});
test('V4.4 detects revised question and duplicate issuance IDs',()=>{
 const issued=issueReassessment(core,a,t,createReassessmentLedger(),opts);
 assert.throws(()=>issueReassessment(core,a,t,issued.ledger,opts),/duplicate issue/);
 const changed={...core,questions:core.questions.map(q=>q.id==='q2'?{...q,revision:'2'}:q)};
 const answered=answer(a,'a2','q2','a','2026-01-01T12:01:00Z');
 assert.equal(verifyIssuedReassessment(changed,answered,issued.ledger,{issueId:'i1',followupAttemptId:'a2',at:'2026-01-01T13:00:00Z'}).status,'stale-evidence');
});
