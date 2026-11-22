import test from 'node:test';
import assert from 'node:assert/strict';
import { importOpenContentPack } from '../src/content-adapter.js';
import { importMarkdownContentPack } from '../src/markdown-content.js';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../src/learning-progress.js';
import { buildStudyDeskView } from '../src/study-desk.js';
import { STUDY_DESK_SAMPLE } from '../examples/web/study-desk-sample.js';
import { NUMBER_LINE_SAMPLE } from '../examples/web/visual-learning-samples.js';

const imported=importOpenContentPack(STUDY_DESK_SAMPLE);
const A=()=>createAssessmentHistory(),T=()=>createTeachingHistory();
const at='2026-01-01T10:30:00.000Z';
const view=(outcomeId,assessments=A(),teaching=T(),options={})=>
  buildStudyDeskView(imported,assessments,teaching,{outcomeId,at,...options});

test('one original content pack drives 4 topics, 3 visual model types and related questions',()=>{
  assert.equal(imported.core.outcomes.length,4);
  const fraction=view('compare-fractions');
  assert.equal(fraction.format,'fark-study-desk-view');
  assert.equal(fraction.lesson.title,'Compare the size of one piece');
  assert.equal(fraction.lesson.visual.kind,'fraction-comparison');
  assert.equal(fraction.lesson.visual.model.label,'1/3 > 1/4');
  assert.equal(fraction.question.id,'q-fraction-a');
  assert.equal(fraction.path.status,'first-question');
  assert.deepEqual(fraction.outcome.prerequisites.map(p=>p.outcomeId),['equal-parts']);
  assert.equal(fraction.outcome.prerequisites[0].status,'not-observed');
  assert.equal(fraction.mastery,null);
  const line=view('signed-position');
  assert.equal(line.lesson.visual.kind,'number-line');
  assert.deepEqual(line.lesson.visual.model.points,[-3,0,4]);
  assert.equal(line.lesson.visual.model.ticks.length,11);
  assert.equal(line.question.id,'q-line');
  const history=view('fictional-order');
  assert.equal(history.lesson.visual.kind,'timeline');
  assert.deepEqual(history.lesson.visual.model.events.map(e=>e.year),[1860,1872,1895]);
  assert.equal(history.question.id,'q-events');
  assert.equal(history.lesson.visual.model.mastery,null);
  const plain=view('equal-parts');
  assert.equal(plain.lesson.title,'Every piece is equal');
  assert.equal(plain.lesson.visual,null);
});

test('wrong answer uses real learning workflow and a review enables issuing a distinct question',()=>{
  const baseline=recordAssessment(imported.core,A(),{
    attemptId:'a1',questionId:'q-fraction-a',
    selectedChoiceId:'b',at:'2026-01-01T10:00:00Z'
  }).history;
  const first=view('compare-fractions',baseline);
  assert.equal(first.path.status,'teaching-needed');
  assert.equal(first.path.baselineAttemptId,'a1');
  assert.equal(first.path.resourceId,'lesson-fraction');
  assert.equal(first.question,null);
  assert.equal(first.outcome.incorrect,1);
  assert.equal(first.outcome.prerequisites[0].status,'not-observed');
  const teaching=recordTeachingCompletion(imported.core,baseline,T(),{
    completionId:'c1',resourceId:'lesson-fraction',
    baselineAttemptId:'a1',at:'2026-01-01T10:05:00Z'
  }).history;
  const ready=view('compare-fractions',baseline,teaching);
  assert.equal(ready.path.status,'ready-to-reassess');
  assert.equal(ready.path.questionId,'q-fraction-b');
  assert.equal(ready.question,null);
  const issued=view('compare-fractions',baseline,teaching,{issuedQuestionId:'q-fraction-b'});
  assert.equal(issued.question.id,'q-fraction-b');
  assert.deepEqual(issued.question.choices.map(c=>c.text),['2/5','2/7']);
  assert.equal(issued.question.correctChoiceId,undefined);
  assert.equal(issued.mastery,null);
});

test('later correct response is an observation, never retroactive inferred mastery',()=>{
  let history=recordAssessment(imported.core,A(),{
    attemptId:'a1',questionId:'q-fraction-a',
    selectedChoiceId:'b',at:'2026-01-01T10:00:00Z'
  }).history;
  history=recordAssessment(imported.core,history,{
    attemptId:'a2',questionId:'q-fraction-b',
    selectedChoiceId:'a',at:'2026-01-01T10:06:00Z'
  }).history;
  const result=view('compare-fractions',history);
  assert.equal(result.path.status,'latest-correct');
  assert.equal(result.path.resourceId,null);
  assert.equal(result.outcome.correct,1);
  assert.equal(result.outcome.incorrect,1);
  assert.equal(result.question,null);
  assert.equal(result.mastery,null);
});

test('author-supplied restricted Markdown drives the same number-line without another renderer',()=>{
  const pack=importMarkdownContentPack(NUMBER_LINE_SAMPLE);
  const result=buildStudyDeskView(pack,A(),T(),{
    outcomeId:'locate-integers',at
  });
  assert.equal(result.lesson.visual.kind,'number-line');
  assert.deepEqual(result.lesson.visual.model.points,[-3,0,4]);
  assert.equal(result.question.id,'signed-practice');
  assert.equal(result.path.status,'first-question');
});

test('no questions, unsupported selections and invalid issued questions fail honestly',()=>{
  const noQ=structuredClone(STUDY_DESK_SAMPLE);
  noQ.questions=noQ.questions.filter(q=>q.id!=='q-fraction-a'&&q.id!=='q-fraction-b');
  const parsed=importOpenContentPack(noQ);
  const noQuestion=buildStudyDeskView(parsed,A(),T(),{outcomeId:'compare-fractions',at});
  assert.equal(noQuestion.question,null);
  assert.equal(noQuestion.path.status,'no-question');
  const baseline=view('signed-position');
  assert.ok(baseline.lesson);
  assert.throws(()=>view('unknown'),/unknown study desk outcome/);
  assert.throws(()=>view('compare-fractions',A(),T(),{issuedQuestionId:'q-events'}),/not linked/);
  assert.throws(()=>view('compare-fractions',A(),T(),{issuedQuestionId:123}),/not linked/);
});

test('content and answer history are never mutated and authored HTML remains inert text',()=>{
  const source=JSON.stringify(imported),history=A();
  const result=view('compare-fractions',history);
  assert.equal(JSON.stringify(imported),source);
  assert.deepEqual(history,A());
  const badLabel='<img src=x onerror=alert(1)>';
  const modified=structuredClone(STUDY_DESK_SAMPLE);
  modified.lessons.find(l=>l.id==='lesson-fraction').bodyText=badLabel;
  const example=buildStudyDeskView(importOpenContentPack(modified),A(),T(),{
    outcomeId:'compare-fractions',at
  });
  assert.equal(example.lesson.bodyText,badLabel);
  assert.equal(typeof example.lesson.bodyText,'string');
  assert.equal(result.disclaimer.includes('not established'),true);
});
