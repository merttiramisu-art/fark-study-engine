import test from 'node:test';
import assert from 'node:assert/strict';
import { importMarkdownContentPack } from '../src/markdown-content.js';
import { importOpenContentPack } from '../src/content-adapter.js';
import { buildConceptMap, CONCEPT_MAP_LIMITS } from '../src/concept-map.js';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { CONCEPT_AUTHORING_SAMPLE } from '../examples/web/concept-map-authoring-sample.js';
import { CONCEPT_MAP_SAMPLE } from '../examples/web/concept-map-sample.js';

test('V7 editable Markdown creates a DIFFERENT, explicit, bounded concept graph', () => {
  const imported = importMarkdownContentPack(CONCEPT_AUTHORING_SAMPLE);
  const original = importOpenContentPack(CONCEPT_MAP_SAMPLE);
  const map = buildConceptMap(imported.core, createAssessmentHistory());
  const originalMap = buildConceptMap(original.core, createAssessmentHistory());
  assert.equal(map.nodes.length, 3);
  assert.equal(map.edges.length, 2);
  assert.equal(imported.core.questions.length, 2);
  assert.equal(imported.attribution.title, 'Original Shape Connections');
  assert.deepEqual(map.edges.map(edge => [edge.from, edge.to]), [
    ['compare-shapes', 'classify-shapes'],
    ['recognize-shape', 'compare-shapes']
  ]);
  assert.equal(map.nodes.find(n=>n.id==='recognize-shape').status, 'not-observed');
  assert.equal(map.nodes.find(n=>n.id==='classify-shapes').questionIds.length, 0);
  assert.equal(originalMap.nodes.length, 5);
  assert.equal(originalMap.edges.length, 4);
  assert.equal(map.mastery, null);
});

test('real observations affect imported outcomes only; other nodes remain unknown', () => {
  const {core} = importMarkdownContentPack(CONCEPT_AUTHORING_SAMPLE);
  const history = recordAssessment(core, createAssessmentHistory(), {
    attemptId:'shape-1', questionId:'shape-comparison',
    selectedChoiceId:'a', at:'2026-01-01T12:00:00Z'
  }).history;
  const map = buildConceptMap(core, history);
  const selected = map.nodes.find(n => n.id === 'compare-shapes');
  assert.equal(selected.status,'incorrect-observed');
  assert.equal(selected.incorrect,1);
  assert.equal(map.nodes.find(n=>n.id==='recognize-shape').status,'not-observed');
  assert.equal(map.nodes.find(n=>n.id==='classify-shapes').status,'not-observed');
  const empty = buildConceptMap(core, createAssessmentHistory());
  assert.equal(empty.nodes.find(n=>n.id==='compare-shapes').status,'not-observed');
  assert.equal(empty.nodes.find(n=>n.id==='compare-shapes').mastery,null);
  assert.equal(map.mastery,null);
});

test('bad author-supplied cross-links, cycles and duplicates are rejected', () => {
  for (const modified of [
    CONCEPT_AUTHORING_SAMPLE.replace('prerequisiteIds: compare-shapes', 'prerequisiteIds: missing'),
    CONCEPT_AUTHORING_SAMPLE.replace('label: Recognize a shape',
      'label: Recognize a shape\nprerequisiteIds: classify-shapes'),
    CONCEPT_AUTHORING_SAMPLE.replace('## Outcome: compare-shapes','## Outcome: recognize-shape'),
    CONCEPT_AUTHORING_SAMPLE.replace('correctChoiceId: b','correctChoiceId: absent')
  ]) {
    assert.throws(() => importMarkdownContentPack(modified));
  }
});

test('the map refuses too many outcomes even when the content pack accepts them', () => {
  const source = structuredClone(CONCEPT_MAP_SAMPLE);
  for (let i = 0; i < CONCEPT_MAP_LIMITS.maxOutcomes; i++) {
    source.outcomes.push({
      id:'extra-' + i,
      unitId:'fractions',
      label:'Original extra outcome ' + i
    });
  }
  const imported = importOpenContentPack(source);
  assert.throws(
    () => buildConceptMap(imported.core, createAssessmentHistory()),
    /exceeds 150 outcomes/
  );
});

test('untrusted author labels stay inert data; imported graph never evaluates HTML', () => {
  const text = '<img src=x onerror=alert(1)>';
  const modified = CONCEPT_AUTHORING_SAMPLE.replace('label: Compare two shapes',
    'label: ' + text);
  const imported = importMarkdownContentPack(modified);
  const map = buildConceptMap(imported.core, createAssessmentHistory());
  assert.equal(map.nodes.find(n=>n.id==='compare-shapes').label, text);
  assert.equal(typeof map.nodes.find(n=>n.id==='compare-shapes').label, 'string');
});
