import test from 'node:test';
import assert from 'node:assert/strict';
import { importOpenContentPack } from '../src/content-adapter.js';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { buildConceptMap, CONCEPT_MAP_LIMITS } from '../src/concept-map.js';
import { CONCEPT_MAP_SAMPLE } from '../examples/web/concept-map-sample.js';

const {core} = importOpenContentPack(CONCEPT_MAP_SAMPLE);
function answer(history, questionId, choiceId, attemptId) {
  return recordAssessment(core,history,{
    attemptId,questionId,selectedChoiceId:choiceId,
    at:'2026-01-01T12:00:00.000Z'
  }).history;
}
const find=(report,id)=>report.nodes.find(node=>node.id===id);

test('V7 concept map represents only explicit curriculum prerequisite links', () => {
  const report=buildConceptMap(core,createAssessmentHistory());
  assert.equal(report.format,'fark-concept-map');
  assert.equal(report.nodes.length,5);
  assert.equal(report.edges.length,4);
  assert.deepEqual(report.levels,[0,1,2,3]);
  assert.deepEqual(report.edges.map(edge=>edge.from+':'+edge.to),[
    'equal-parts:numerator','numerator:unit-fraction',
    'unit-fraction:compare-fractions','unit-fraction:equivalent-fractions'
  ]);
  const compare=find(report,'compare-fractions');
  assert.equal(compare.level,3);
  assert.deepEqual(compare.prerequisiteIds,['unit-fraction']);
  assert.equal(compare.status,'not-observed');
  assert.equal(compare.mastery,null);
  assert.equal(report.mastery,null);
  assert.match(report.disclaimer,/not proven causal/);
});

test('real answer-key observations change only observed node, never inferred prerequisites', () => {
  const empty=createAssessmentHistory();
  const wrong=answer(empty,'q-compare','b','a1');
  const report=buildConceptMap(core,wrong);
  const target=find(report,'compare-fractions');
  assert.equal(target.attempts,1);
  assert.equal(target.incorrect,1);
  assert.equal(target.correct,0);
  assert.equal(target.status,'incorrect-observed');
  assert.equal(target.misconceptionCounts['denominator-size'],1);
  assert.equal(find(report,'unit-fraction').status,'not-observed');
  assert.equal(find(report,'equal-parts').status,'not-observed');
  assert.deepEqual(empty,createAssessmentHistory());
  const correct=answer(wrong,'q-compare','a','a2');
  const mixed=find(buildConceptMap(core,correct),'compare-fractions');
  assert.equal(mixed.status,'mixed-observations');
  assert.equal(mixed.attempts,2);
  assert.equal(mixed.correct,1);
  assert.equal(mixed.incorrect,1);
  assert.equal(mixed.mastery,null);
  assert.equal(find(buildConceptMap(core,answer(empty,'q-compare','a','a3')),'compare-fractions').status,'correct-observed');
});

test('outdated and orphan attempts are excluded from visible evidence and reported separately', () => {
  const observed=answer(createAssessmentHistory(),'q-compare','b','a1');
  const outdated=structuredClone(core);
  outdated.questions.find(q=>q.id==='q-compare').revision='2';
  const stale=buildConceptMap(outdated,observed);
  assert.deepEqual(stale.excluded.staleAttemptIds,['a1']);
  assert.equal(find(stale,'compare-fractions').status,'not-observed');
  const orphan=structuredClone(observed);
  orphan.attempts[0].questionId='missing';
  const ignored=buildConceptMap(core,orphan);
  assert.deepEqual(ignored.excluded.orphanAttemptIds,['a1']);
  assert.equal(find(ignored,'compare-fractions').attempts,0);
});

test('evidence from a multi-outcome question is shared, not counted as independent mastery proof', () => {
  const multiple=structuredClone(core);
  multiple.questions.find(q=>q.id==='q-compare').outcomeIds.push('equivalent-fractions');
  const observed=recordAssessment(multiple,createAssessmentHistory(),{
    attemptId:'shared',questionId:'q-compare',selectedChoiceId:'a',
    at:'2026-01-01T12:00:00.000Z'
  }).history;
  const map=buildConceptMap(multiple,observed);
  assert.equal(find(map,'compare-fractions').correct,1);
  assert.equal(find(map,'equivalent-fractions').correct,1);
  assert.equal(find(map,'equivalent-fractions').mastery,null);
  assert.match(map.disclaimer,/share evidence/);
});

test('model is read-only and rejects invalid graph, evidence and oversized maps', () => {
  const history=answer(createAssessmentHistory(),'q-compare','a','a1');
  const baselineCore=JSON.stringify(core), baselineHistory=JSON.stringify(history);
  buildConceptMap(core,history);
  assert.equal(JSON.stringify(core),baselineCore);
  assert.equal(JSON.stringify(history),baselineHistory);
  const badHistory=structuredClone(history);
  badHistory.attempts.push({...badHistory.attempts[0]});
  assert.throws(()=>buildConceptMap(core,badHistory),/duplicate attempt id/);
  const cycle=structuredClone(core);
  cycle.outcomes.find(o=>o.id==='equal-parts').prerequisiteIds=['compare-fractions'];
  assert.throws(()=>buildConceptMap(cycle,history),/cyclic outcome prerequisites/);
  const large=structuredClone(core);
  for(let n=0;n<CONCEPT_MAP_LIMITS.maxOutcomes;n++) {
    large.outcomes.push({id:'extra-'+n,unitId:'fractions',label:'Extra '+n});
  }
  assert.throws(()=>buildConceptMap(large,createAssessmentHistory()),/exceeds 150 outcomes/);
});
