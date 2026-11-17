import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentHistory,recordAssessment} from '../src/assessment.js';
import {createTeachingHistory,recordTeachingCompletion} from '../src/learning-progress.js';
import {getLearningNextStep} from '../src/learning-orchestrator.js';
import {auditLearningEvidence} from '../src/evidence-integrity.js';

const core={format:'fark-knowledge-core',version:1,units:[{id:'u',label:'Unit'}],
 outcomes:[{id:'a',unitId:'u',label:'A'},{id:'b',unitId:'u',label:'B'}],
 resources:[{id:'ra',kind:'lesson',revision:'1',outcomeIds:['a']},{id:'rb',kind:'lesson',revision:'1',outcomeIds:['b']}],
 questions:[{id:'q1',revision:'1',outcomeIds:['a','b'],correctChoiceId:'yes',choices:[{id:'yes'},{id:'no'}]},
 {id:'q2',revision:'1',outcomeIds:['b'],correctChoiceId:'yes',choices:[{id:'yes'},{id:'no'}]}],mappings:[]};
const assessments=recordAssessment(core,createAssessmentHistory(),{attemptId:'a1',questionId:'q1',selectedChoiceId:'no',at:'2026-01-01T10:00:00Z'}).history;
const teaching=createTeachingHistory();
const at='2026-01-01T12:00:00Z';
test('V4.3 does not unlock outcome B after completing only outcome A material',()=>{
 const t=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'ra',baselineAttemptId:'a1',at:'2026-01-01T11:00:00Z'}).history;
 const step=getLearningNextStep(core,assessments,t,{at,baselineAttemptId:'a1',outcomeId:'b'});
 assert.equal(step.status,'teaching-needed');
 assert.equal(step.resources[0].resourceId,'rb');
});
test('V4.3 audits clean current evidence and returns no mastery',()=>{
 const t=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'rb',baselineAttemptId:'a1',at:'2026-01-01T11:00:00Z'}).history;
 const result=auditLearningEvidence(core,assessments,t,{at});
 assert.equal(result.safeForDescriptiveAnalysis,true);
 assert.equal(result.summary.usableCompletions,1);
 assert.equal(result.summary.usableAttempts,1);
});
test('V4.3 reports future and stale attempts and unusable completions',()=>{
 const t=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'rb',baselineAttemptId:'a1',at:'2026-01-01T11:00:00Z'}).history;
 const revised={...core,questions:core.questions.map(q=>q.id==='q1'?{...q,revision:'2'}:q)};
 const result=auditLearningEvidence(revised,assessments,t,{at});
 assert.deepEqual(result.attempts[0].problems,['stale-or-inconsistent-answer']);
 assert.deepEqual(result.completions[0].problems,['unusable-baseline']);
 assert.equal(result.safeForDescriptiveAnalysis,false);
 const future=auditLearningEvidence(core,assessments,t,{at:'2026-01-01T10:30:00Z'});
 assert.deepEqual(future.completions[0].problems,['future-completion']);
});
test('V4.3 detects mismatched teaching resources, preserves input',()=>{
 const t=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'rb',baselineAttemptId:'a1',at:'2026-01-01T11:00:00Z'}).history;
 const before=JSON.stringify(t);
 const modified={...core,resources:[{...core.resources[0]},{...core.resources[1],revision:'2'}]};
 const result=auditLearningEvidence(modified,assessments,t,{at});
 assert.deepEqual(result.completions[0].problems,['stale-or-missing-resource']);
 assert.equal(JSON.stringify(t),before);
 assert.throws(()=>auditLearningEvidence(core,assessments,t,{at:'not a date'}),/invalid/);
});
