import test from 'node:test';
import assert from 'node:assert/strict';
import { importOpenContentPack } from '../src/content-adapter.js';
import { importMarkdownContentPack } from '../src/markdown-content.js';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../src/learning-progress.js';
import { getConceptStudyPath } from '../src/concept-study-path.js';
import { createReassessmentLedger, issueReassessment, verifyIssuedReassessment } from '../src/reassessment-ledger.js';
import { CONCEPT_MAP_SAMPLE } from '../examples/web/concept-map-sample.js';
import { CONCEPT_AUTHORING_SAMPLE } from '../examples/web/concept-map-authoring-sample.js';

const { core } = importOpenContentPack(CONCEPT_MAP_SAMPLE);
const T = {
  t0:'2026-01-01T10:00:00.000Z',
  t1:'2026-01-01T10:01:00.000Z',
  t2:'2026-01-01T10:02:00.000Z',
  t3:'2026-01-01T10:03:00.000Z',
  t4:'2026-01-01T10:04:00.000Z'
};
const guide=(c,a,t,outcomeId,at=T.t4)=>getConceptStudyPath(c,a,t,{outcomeId,at});

test('unanswered concept suggests one unanswered editorial question, without inventing prerequisite failures', () => {
  const result=guide(core,createAssessmentHistory(),createTeachingHistory(),'compare-fractions');
  assert.equal(result.format,'fark-concept-study-path');
  assert.equal(result.status,'first-question');
  assert.equal(result.questionId,'q-compare');
  assert.equal(result.resourceId,null);
  assert.equal(result.mastery,null);
  assert.deepEqual(result.prerequisites.map(x=>[x.outcomeId,x.status]),[['unit-fraction','not-observed']]);
  assert.match(result.reason,/No valid answer/);
  const noQuestion=guide(core,createAssessmentHistory(),createTeachingHistory(),'numerator');
  assert.equal(noQuestion.status,'no-question');
  assert.equal(noQuestion.nextAction,'editorial-review');
});

test('a wrong answer routes to a REAL editorial lesson; a later correct answer suppresses remedial inference', () => {
  const wrong=recordAssessment(core,createAssessmentHistory(),{
    attemptId:'a1',questionId:'q-compare',selectedChoiceId:'b',at:T.t0
  }).history;
  const result=guide(core,wrong,createTeachingHistory(),'compare-fractions',T.t1);
  assert.equal(result.status,'teaching-needed');
  assert.equal(result.resourceId,'lesson-compare');
  assert.equal(result.baselineAttemptId,'a1');
  assert.equal(result.nextAction,'present-teaching');
  assert.equal(result.mastery,null);
  assert.equal(result.prerequisites[0].status,'not-observed');
  const later=recordAssessment(core,wrong,{
    attemptId:'a2',questionId:'q-compare-followup',selectedChoiceId:'a',at:T.t2
  }).history;
  const now=guide(core,later,createTeachingHistory(),'compare-fractions',T.t3);
  assert.equal(now.status,'latest-correct');
  assert.equal(now.resourceId,null);
  assert.equal(now.latestAttemptId,'a2');
  assert.equal(now.mastery,null);
});

test('recorded self-report enables explicit issue of a different question and first-response verification', () => {
  let attempts=recordAssessment(core,createAssessmentHistory(),{
    attemptId:'a1',questionId:'q-compare',selectedChoiceId:'b',at:T.t0
  }).history;
  let teaching=createTeachingHistory();
  const r=guide(core,attempts,teaching,'compare-fractions',T.t1);
  assert.equal(r.status,'teaching-needed');
  teaching=recordTeachingCompletion(core,attempts,teaching,{
    completionId:'c1',resourceId:r.resourceId,
    baselineAttemptId:r.baselineAttemptId,at:T.t2
  }).history;
  const ready=guide(core,attempts,teaching,'compare-fractions',T.t3);
  assert.equal(ready.status,'ready-to-reassess');
  assert.equal(ready.questionId,'q-compare-followup');
  const issue=issueReassessment(core,attempts,teaching,createReassessmentLedger(),{
    issueId:'i1',baselineAttemptId:ready.baselineAttemptId,
    outcomeId:'compare-fractions',at:T.t3
  });
  assert.equal(issue.status,'issued');
  assert.equal(issue.issue.questionId,'q-compare-followup');
  attempts=recordAssessment(core,attempts,{
    attemptId:'a2',questionId:issue.issue.questionId,
    selectedChoiceId:'a',at:T.t4
  }).history;
  const verification=verifyIssuedReassessment(core,attempts,issue.ledger,{
    issueId:'i1',followupAttemptId:'a2',at:'2026-01-01T10:05:00.000Z'
  });
  assert.equal(verification.status,'verified-issued-answer');
  assert.equal(verification.comparison.followupCorrect,true);
  assert.equal(verification.mastery,null);
  assert.equal(guide(core,attempts,teaching,'compare-fractions','2026-01-01T10:05:00.000Z').status,'latest-correct');
});

test('author-owned lesson with no different unattempted question reports editorial limitation', () => {
  const imported=importMarkdownContentPack(CONCEPT_AUTHORING_SAMPLE);
  const shape=imported.core;
  const attempts=recordAssessment(shape,createAssessmentHistory(),{
    attemptId:'shape-a1',questionId:'shape-comparison',selectedChoiceId:'a',at:T.t0
  }).history;
  const linked=guide(shape,attempts,createTeachingHistory(),'compare-shapes',T.t1);
  assert.equal(linked.status,'teaching-needed');
  assert.equal(linked.resourceId,'shape-lesson');
  const teaching=recordTeachingCompletion(shape,attempts,createTeachingHistory(),{
    completionId:'shape-c1',resourceId:'shape-lesson',baselineAttemptId:'shape-a1',at:T.t2
  }).history;
  const later=guide(shape,attempts,teaching,'compare-shapes',T.t3);
  assert.equal(later.status,'no-reassessment-question');
  assert.equal(later.questionId,null);
  assert.match(later.reason,/no unused different question/);
});

test('future and stale answers are not treated as valid path observations', () => {
  const future=recordAssessment(core,createAssessmentHistory(),{
    attemptId:'future',questionId:'q-compare',selectedChoiceId:'b',
    at:'2026-02-01T00:00:00.000Z'
  }).history;
  const before=guide(core,future,createTeachingHistory(),'compare-fractions',T.t4);
  assert.equal(before.status,'first-question');
  assert.deepEqual(before.ignoredFutureAttemptIds,['future']);
  // A stale revision still blocks a question ID from being described as unseen.
  const current=recordAssessment(core,createAssessmentHistory(),{
    attemptId:'old',questionId:'q-compare',selectedChoiceId:'b',at:T.t0
  }).history;
  const updated=structuredClone(core);
  updated.questions.find(q=>q.id==='q-compare').revision='2';
  const stale=guide(updated,current,createTeachingHistory(),'compare-fractions',T.t4);
  assert.equal(stale.status,'first-question');
  assert.equal(stale.questionId,'q-compare-followup');
  assert.equal(stale.latestAttemptId,null);
});

test('guide is read-only, outcome-specific and requires validated evidence', () => {
  const history=recordAssessment(core,createAssessmentHistory(),{
    attemptId:'a1',questionId:'q-parts',selectedChoiceId:'a',at:T.t0
  }).history;
  const original=JSON.stringify(core), oldHistory=JSON.stringify(history);
  const result=guide(core,history,createTeachingHistory(),'compare-fractions');
  assert.equal(result.prerequisites[0].status,'not-observed');
  assert.equal(result.status,'first-question');
  assert.equal(JSON.stringify(core),original);
  assert.equal(JSON.stringify(history),oldHistory);
  assert.throws(()=>guide(core,history,createTeachingHistory(),'missing'),/unknown concept outcome/);
  assert.throws(()=>guide(core,history,createTeachingHistory(),'compare-fractions','bad-time'),/invalid concept path timestamp/);
  const dup=structuredClone(history); dup.attempts.push({...dup.attempts[0]});
  assert.throws(()=>guide(core,dup,createTeachingHistory(),'compare-fractions'),/duplicate attempt id/);
});
