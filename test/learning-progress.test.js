import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentHistory,recordAssessment} from '../src/assessment.js';
import {createTeachingHistory,recordTeachingCompletion,planPersonalStudy,getLearningEvidenceReport} from '../src/learning-progress.js';
const core={format:'fark-knowledge-core',version:1,units:[{id:'u',label:'Unit'}],outcomes:[{id:'o',unitId:'u',label:'Outcome'}],
 resources:[{id:'lesson',kind:'lesson',revision:'1',outcomeIds:['o']}],
 questions:[{id:'q1',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b',misconceptionId:'mixup'}]},
 {id:'q2',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]}],mappings:[]};
const assessments=recordAssessment(core,createAssessmentHistory(),{attemptId:'a1',questionId:'q1',selectedChoiceId:'b',at:'2026-01-01T10:00:00Z'}).history;
const at='2026-01-02T10:00:00Z';
test('V3.1 completion is immutable, versioned, aligned and time ordered',()=>{
 const empty=createTeachingHistory();
 const result=recordTeachingCompletion(core,assessments,empty,{completionId:'c1',resourceId:'lesson',baselineAttemptId:'a1',at});
 assert.equal(empty.completions.length,0);
 assert.equal(result.history.completions[0].resourceRevision,'1');
 assert.throws(()=>recordTeachingCompletion(core,assessments,result.history,{completionId:'c1',resourceId:'lesson',baselineAttemptId:'a1',at}),/duplicate/);
 assert.throws(()=>recordTeachingCompletion(core,assessments,empty,{completionId:'c2',resourceId:'lesson',baselineAttemptId:'a1',at:'2025-12-31'}),/before baseline/);
});
test('V3.4 produces bounded, explainable recommendations with unused questions',()=>{
 const plan=planPersonalStudy(core,assessments,createTeachingHistory(),{at,limit:1,maxPerUnit:1});
 assert.equal(plan.plannedCount,1);
 assert.equal(plan.planned[0].unseenQuestionId,'q2');
 assert.deepEqual(plan.planned[0].resourceIds,['lesson']);
 assert.equal(planPersonalStudy(core,assessments,createTeachingHistory(),{at,limit:0}).plannedCount,0);
 assert.equal(planPersonalStudy(core,assessments,createTeachingHistory(),{at,maxPerUnit:0}).plannedCount,0);
 assert.throws(()=>planPersonalStudy(core,assessments,createTeachingHistory(),{at,limit:-1}),/nonnegative/);
});
test('V3.5 keeps correct/incorrect and self-reported teaching separate from mastery',()=>{
 const teaching=recordTeachingCompletion(core,assessments,createTeachingHistory(),{completionId:'c1',resourceId:'lesson',baselineAttemptId:'a1',at}).history;
 const report=getLearningEvidenceReport(core,assessments,teaching,{at:'2026-01-03'});
 assert.equal(report.outcomes[0].incorrect,1);
 assert.equal(report.outcomes[0].teachingCompletions,1);
 assert.equal(report.outcomes[0].mastery,null);
 assert.equal(report.totals.correct,0);
 const early=getLearningEvidenceReport(core,assessments,teaching,{at:'2026-01-01T12:00:00Z'});
 assert.equal(early.outcomes[0].teachingCompletions,0);
 assert.deepEqual(early.excluded.futureCompletions,['c1']);
});
test('revised questions and lessons are excluded from current evidence',()=>{
 const teaching=recordTeachingCompletion(core,assessments,createTeachingHistory(),{completionId:'c1',resourceId:'lesson',baselineAttemptId:'a1',at}).history;
 const changed={...core,questions:core.questions.map(q=>q.id==='q1'?{...q,revision:'2'}:q),resources:[{...core.resources[0],revision:'2'}]};
 const report=getLearningEvidenceReport(changed,assessments,teaching,{at:'2026-01-03'});
 assert.deepEqual(report.excluded.staleAttempts,['a1']);
 assert.deepEqual(report.excluded.staleCompletions,['c1']);
 assert.equal(report.outcomes[0].attempts,0);
 assert.equal(planPersonalStudy(changed,assessments,teaching,{at:'2026-01-03'}).plannedCount,0);
});
