import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { planRemediation, planReassessment, compareReassessment } from '../src/learning-loop.js';

const core = {
  format:'fark-knowledge-core',version:1,
  units:[{id:'u',label:'Unit'}],
  outcomes:[{id:'o',unitId:'u',label:'Outcome'}],
  resources:[
    {id:'general',kind:'lesson',revision:'1',outcomeIds:['o']},
    {id:'specific',kind:'comparison',revision:'2',outcomeIds:['o'],misconceptionIds:['mixup']},
    {id:'unrelated',kind:'lesson',revision:'1',outcomeIds:['o'],misconceptionIds:['other']}
  ],
  questions:[
    {id:'q1',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b',misconceptionId:'mixup'}]},
    {id:'q2',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
    {id:'q3',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]}
  ], mappings:[]
};
function record(history,attemptId,questionId,selectedChoiceId,at) {
  return recordAssessment(core,history,{attemptId,questionId,selectedChoiceId,at}).history;
}
const baseline=record(createAssessmentHistory(),'first','q1','b','2026-01-01T10:00:00Z');
test('V3.1 recommends misconception-specific and general resources without inventing content',()=>{
  const result=planRemediation(core,baseline,{attemptId:'first'});
  assert.equal(result.status,'ready');
  assert.deepEqual(result.recommendations[0].resources.map(r=>r.resourceId),['specific','general']);
  assert.equal(result.recommendations[0].resources[0].resourceRevision,'2');
});
test('V3.2 picks a different unused aligned question deterministically',()=>{
  const next=planReassessment(core,baseline,{attemptId:'first',outcomeId:'o'});
  assert.equal(next.questionId,'q2');
  const withSecond=record(baseline,'second','q2','a','2026-01-02T10:00:00Z');
  assert.equal(planReassessment(core,withSecond,{attemptId:'first',outcomeId:'o'}).questionId,'q3');
  const report=compareReassessment(core,withSecond,{baselineAttemptId:'first',followupAttemptId:'second',outcomeId:'o'});
  assert.equal(report.followupCorrect,true);
  assert.equal(report.mastery,null);
  assert.equal(report.elapsedMs,86400000);
});
test('exhausted question pool is reported instead of recycling the same item',()=>{
  let history=record(baseline,'second','q2','b','2026-01-02');
  history=record(history,'third','q3','a','2026-01-03');
  assert.equal(planReassessment(core,history,{attemptId:'first',outcomeId:'o'}).status,'no-independent-question');
});
test('rejects reversed timing and same-question retest as learning evidence',()=>{
  const same=record(baseline,'repeat','q1','a','2026-01-02');
  assert.throws(()=>compareReassessment(core,same,{baselineAttemptId:'first',followupAttemptId:'repeat',outcomeId:'o'}),/different question/);
  const earlier=record(baseline,'early','q2','a','2025-12-31');
  assert.throws(()=>compareReassessment(core,earlier,{baselineAttemptId:'first',followupAttemptId:'early',outcomeId:'o'}),/later/);
});
test('changed baseline content cannot silently drive intervention or evaluation',()=>{
  const changed={...core,questions:core.questions.map(q=>q.id==='q1'?{...q,revision:'2'}:q)};
  assert.equal(planRemediation(changed,baseline,{attemptId:'first'}).status,'stale-evidence');
  assert.equal(planReassessment(changed,baseline,{attemptId:'first',outcomeId:'o'}).status,'stale-evidence');
  const followup=record(baseline,'second','q2','a','2026-01-02');
  assert.equal(compareReassessment(changed,followup,{baselineAttemptId:'first',followupAttemptId:'second',outcomeId:'o'}).status,'stale-evidence');
});
test('missing resources and invalid outcomes are explicit',()=>{
  const empty={...core,resources:[]};
  assert.equal(planRemediation(empty,baseline,{attemptId:'first'}).status,'no-matching-resource');
  assert.throws(()=>planReassessment(core,baseline,{attemptId:'first',outcomeId:'unknown'}),/not linked/);
});
