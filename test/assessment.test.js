import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssessmentHistory, recordAssessment, summarizeAssessments } from '../src/assessment.js';

const core = {
  format:'fark-knowledge-core', version:1,
  units:[{id:'u',label:'Unit'}],
  outcomes:[{id:'o',unitId:'u',label:'Outcome'}],
  resources:[],
  questions:[{id:'q',outcomeIds:['o'],revision:'1',correctChoiceId:'a',choices:[
    {id:'a'}, {id:'b',misconceptionId:'confused-concepts'}
  ]}],
  mappings:[]
};
test('actual answer-key result and misconception are distinct from self-ratings',()=>{
  const empty=createAssessmentHistory();
  const {history,attempt}=recordAssessment(core,empty,{attemptId:'t1',questionId:'q',selectedChoiceId:'b',at:'2026-01-01'});
  assert.equal(attempt.correct,false);
  assert.equal(attempt.misconceptionId,'confused-concepts');
  assert.equal(empty.attempts.length,0);
  const report=summarizeAssessments(core,history);
  assert.equal(report.outcomes[0].incorrect,1);
  assert.equal(report.outcomes[0].mastery,null);
  assert.equal(report.outcomes[0].misconceptionCounts['confused-concepts'],1);
});
test('question revisions are not silently reassigned to current content',()=>{
  const {history}=recordAssessment(core,createAssessmentHistory(),{attemptId:'t1',questionId:'q',selectedChoiceId:'a',at:'2026-01-01'});
  const changed={...core,questions:[{...core.questions[0],revision:'2'}]};
  const report=summarizeAssessments(changed,history);
  assert.deepEqual(report.staleAttempts,['t1']);
  assert.equal(report.outcomes[0].attempts,0);
});
test('reject invalid choices, answer keys, and duplicate attempt ids',()=>{
  assert.throws(()=>recordAssessment(core,createAssessmentHistory(),{attemptId:'x',questionId:'q',selectedChoiceId:'z',at:'2026-01-01'}),/selected choice/);
  const bad={...core,questions:[{...core.questions[0],correctChoiceId:'z'}]};
  assert.throws(()=>recordAssessment(bad,createAssessmentHistory(),{attemptId:'x',questionId:'q',selectedChoiceId:'a',at:'2026-01-01'}),/answer key/);
  const first=recordAssessment(core,createAssessmentHistory(),{attemptId:'x',questionId:'q',selectedChoiceId:'a',at:'2026-01-01'});
  assert.throws(()=>recordAssessment(core,first.history,{attemptId:'x',questionId:'q',selectedChoiceId:'b',at:'2026-01-02'}),/duplicate attempt/);
});
