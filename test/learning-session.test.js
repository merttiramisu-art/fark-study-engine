import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentHistory,recordAssessment} from '../src/assessment.js';
import {createTeachingHistory,recordTeachingCompletion} from '../src/learning-progress.js';
import {createLearningSession,serializeLearningSession,parseLearningSession,resumeLearningSession} from '../src/learning-session.js';
const core={format:'fark-knowledge-core',version:1,units:[{id:'u',label:'Unit'}],outcomes:[{id:'o',unitId:'u',label:'Outcome'}],
 resources:[{id:'lesson',kind:'lesson',revision:'1',outcomeIds:['o']}],
 questions:[{id:'q1',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
 {id:'q2',revision:'1',outcomeIds:['o'],correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]}],mappings:[]};
const initial=recordAssessment(core,createAssessmentHistory(),{attemptId:'a1',questionId:'q1',selectedChoiceId:'b',at:'2026-01-01T10:00:00Z'}).history;
const teaching=createTeachingHistory();
const checkpoint=()=>createLearningSession(core,initial,teaching,{sessionId:'s1',baselineAttemptId:'a1',outcomeId:'o',at:'2026-01-01T10:30:00Z'});
test('checkpoint is a detached JSON snapshot and resumes at teaching gate',()=>{
 const session=checkpoint();
 initial.attempts[0].selectedChoiceId='b';
 const restored=parseLearningSession(serializeLearningSession(session));
 const result=resumeLearningSession(core,restored,{at:'2026-01-01T11:00:00Z'});
 assert.equal(result.step.status,'teaching-needed');
 assert.equal(result.sessionId,'s1');
 assert.notEqual(result.assessments,restored.assessments);
});
test('resumes completed lesson then a distinct reassessment after restart',()=>{
 const session=checkpoint();
 const done=recordTeachingCompletion(core,initial,teaching,{completionId:'c1',resourceId:'lesson',baselineAttemptId:'a1',at:'2026-01-01T11:00:00Z'}).history;
 const ready=resumeLearningSession(core,parseLearningSession(serializeLearningSession(session)),{at:'2026-01-01T11:30:00Z',teaching:done});
 assert.equal(ready.step.status,'ready-to-reassess');
 assert.equal(ready.step.questionId,'q2');
 const answered=recordAssessment(core,initial,{attemptId:'a2',questionId:'q2',selectedChoiceId:'a',at:'2026-01-01T12:00:00Z'}).history;
 const observed=resumeLearningSession(core,session,{at:'2026-01-01T13:00:00Z',assessments:answered,teaching:done});
 assert.equal(observed.step.status,'reassessment-observed');
 assert.equal(observed.step.comparison.mastery,null);
});
test('rejects removed or mutated persisted events and corrupted checkpoints',()=>{
 const session=checkpoint();
 assert.throws(()=>resumeLearningSession(core,session,{at:'2026-01-02',assessments:createAssessmentHistory()}),/conflicting assessment/);
 const changed=structuredClone(initial);changed.attempts[0].at='2026-01-01T10:01:00Z';
 assert.throws(()=>resumeLearningSession(core,session,{at:'2026-01-02',assessments:changed}),/conflicting assessment/);
 assert.throws(()=>parseLearningSession('not-json'),/malformed/);
 assert.throws(()=>parseLearningSession(JSON.stringify({...session,baselineQuestionId:'wrong'})),/inconsistent/);
 assert.throws(()=>resumeLearningSession(core,session,{at:'2025-12-31'}),/before checkpoint/);
});
test('revised baseline is flagged rather than silently resumed',()=>{
 const changed={...core,questions:core.questions.map(q=>q.id==='q1'?{...q,revision:'2'}:q)};
 assert.equal(resumeLearningSession(changed,checkpoint(),{at:'2026-01-02'}).step.status,'stale-baseline');
});
