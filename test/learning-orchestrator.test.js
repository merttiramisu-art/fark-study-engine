import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentHistory,recordAssessment} from '../src/assessment.js';
import {createTeachingHistory,recordTeachingCompletion} from '../src/learning-progress.js';
import {getLearningNextStep,getLearningDashboard} from '../src/learning-orchestrator.js';
const core={format:'fark-knowledge-core',version:1,units:[{id:'u',label:'Unit'}],
 outcomes:[{id:'o',unitId:'u',label:'Outcome'}],
 resources:[{id:'r',kind:'lesson',revision:'1',outcomeIds:['o']}],
 questions:[
 {id:'q1',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b',misconceptionId:'mix'}]},
 {id:'q2',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
 {id:'q3',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]}
 ],mappings:[]};
const answer=(history,attemptId,questionId,selectedChoiceId,at)=>
 recordAssessment(core,history,{attemptId,questionId,selectedChoiceId,at}).history;
const first='2026-01-01T10:00:00Z',done='2026-01-01T11:00:00Z',after='2026-01-01T12:00:00Z';
const assessments=answer(createAssessmentHistory(),'a1','q1','b',first);
const teaching=createTeachingHistory();
const next=(a=assessments,t=teaching,at=after,c=core)=>
 getLearningNextStep(c,a,t,{at,baselineAttemptId:'a1',outcomeId:'o'});
test('V4 starts with a real editorial teaching resource, not a question',()=>{
 const step=next();
 assert.equal(step.status,'teaching-needed');
 assert.equal(step.nextAction,'present-teaching');
 assert.equal(step.resources[0].resourceId,'r');
 assert.equal(step.completionRequired,true);
 assert.equal(step.mastery,null);
});
test('V4 waits for recorded teaching before reassessment',()=>{
 const t=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'r',baselineAttemptId:'a1',at:done}).history;
 const step=next(assessments,t);
 assert.equal(step.status,'ready-to-reassess');
 assert.equal(step.questionId,'q2');
 const answered=answer(assessments,'a2','q2','a',after);
 const observed=next(answered,t,'2026-01-02');
 assert.equal(observed.status,'reassessment-observed');
 assert.equal(observed.comparison.followupCorrect,true);
 assert.equal(observed.mastery,null);
 assert.equal(teaching.completions.length,0);
});
test('V4 never credits answers before recorded teaching completion',()=>{
 const early=answer(assessments,'early','q2','a','2026-01-01T10:30:00Z');
 const t=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'r',baselineAttemptId:'a1',at:done}).history;
 assert.equal(next(early,t).status,'ready-to-reassess');
 assert.equal(next(early,t).questionId,'q3');
});
test('V4 excludes future teaching events and stale resource revisions',()=>{
 const future=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'r',baselineAttemptId:'a1',at:'2026-02-01'}).history;
 assert.equal(next(assessments,future).status,'teaching-needed');
 const revised={...core,resources:[{...core.resources[0],revision:'2'}]};
 const doneHistory=recordTeachingCompletion(core,assessments,teaching,{completionId:'c2',resourceId:'r',baselineAttemptId:'a1',at:done}).history;
 assert.equal(next(assessments,doneHistory,after,revised).status,'teaching-needed');
});
test('V4 blocks stale baseline and missing teaching/question inventory',()=>{
 const revised={...core,questions:core.questions.map(q=>q.id==='q1'?{...q,revision:'2'}:q)};
 assert.equal(next(assessments,teaching,after,revised).status,'stale-baseline');
 const noResources={...core,resources:[]};
 assert.equal(next(assessments,teaching,after,noResources).status,'no-teaching-resource');
 const t=recordTeachingCompletion(core,assessments,teaching,{completionId:'c1',resourceId:'r',baselineAttemptId:'a1',at:done}).history;
 const exhausted=answer(answer(assessments,'a2','q2','a','2026-01-01T10:20:00Z'),'a3','q3','b','2026-01-01T10:30:00Z');
 assert.equal(next(exhausted,t).status,'no-reassessment-question');
});
test('V4 dashboard aligns analysis, plan and evidence at one time',()=>{
 const d=getLearningDashboard(core,assessments,teaching,{at:after,limit:1});
 assert.equal(d.plan.plannedCount,1);
 assert.equal(d.evidence.outcomes[0].incorrect,1);
 assert.equal(d.gaps.outcomes[0].misconceptionPatterns[0].misconceptionId,'mix');
 assert.equal(d.mastery,null);
 assert.throws(()=>getLearningDashboard(core,assessments,teaching,{at:'invalid'}),/invalid/);
});
