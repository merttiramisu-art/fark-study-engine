import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importOpenContentPack, OPEN_CONTENT_PACK_LIMITS } from '../src/content-adapter.js';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../src/learning-progress.js';
import { getLearningNextStep } from '../src/learning-orchestrator.js';
import { createReassessmentLedger, issueReassessment, verifyIssuedReassessment } from '../src/reassessment-ledger.js';

const sample = JSON.parse(readFileSync(fileURLToPath(new URL('../examples/content-packs/original-fractions.json', import.meta.url)), 'utf8'));
const copy = object => JSON.parse(JSON.stringify(object));

test('V7.0 imports independently authored content as a safe, versioned knowledge core', () => {
  const original = JSON.stringify(sample);
  const result = importOpenContentPack(sample);
  const fromText = importOpenContentPack(original);
  assert.deepEqual(result, fromText);
  assert.equal(result.core.format, 'fark-knowledge-core');
  assert.equal(result.core.questions.length, 2);
  assert.equal(result.core.resources.length, 1);
  assert.equal(result.attribution.license, 'MIT');
  assert.equal(result.materials.lessons[0].id, 'fraction-pieces');
  assert.match(result.disclaimer, /not independently verified/);
  assert.equal(JSON.stringify(sample), original);
  result.core.questions[0].id = 'changed';
  assert.equal(sample.questions[0].id, 'baseline');
});

test('V7.0 imported content supports real FARK assessment, lesson and issued-reassessment APIs', () => {
  const { core } = importOpenContentPack(sample);
  let assessments = recordAssessment(core, createAssessmentHistory(), {
    attemptId: 'first', questionId: 'baseline', selectedChoiceId: 'b', at: '2026-01-01T10:00:00Z'
  }).history;
  let teaching = createTeachingHistory();
  const recommended = getLearningNextStep(core, assessments, teaching, {
    at: '2026-01-01T10:01:00Z', baselineAttemptId: 'first', outcomeId: 'compare-unit-fractions'
  });
  assert.equal(recommended.status, 'teaching-needed');
  assert.equal(recommended.resources[0].resourceId, 'fraction-pieces');
  teaching = recordTeachingCompletion(core, assessments, teaching, {
    completionId: 'lesson-reviewed', resourceId: 'fraction-pieces',
    baselineAttemptId: 'first', at: '2026-01-01T10:05:00Z'
  }).history;
  const issued = issueReassessment(core, assessments, teaching, createReassessmentLedger(), {
    issueId: 'issue', baselineAttemptId: 'first', outcomeId: 'compare-unit-fractions',
    at: '2026-01-01T10:10:00Z'
  });
  assert.equal(issued.status, 'issued');
  assert.equal(issued.issue.questionId, 'followup');
  assessments = recordAssessment(core, assessments, {
    attemptId: 'second', questionId: 'followup', selectedChoiceId: 'a', at: '2026-01-01T10:12:00Z'
  }).history;
  const verified = verifyIssuedReassessment(core, assessments, issued.ledger, {
    issueId: 'issue', followupAttemptId: 'second', at: '2026-01-01T10:15:00Z'
  });
  assert.equal(verified.status, 'verified-issued-answer');
  assert.equal(verified.comparison.followupCorrect, true);
  assert.equal(verified.mastery, null);
});

test('V7.0 requires declared provenance and refuses malformed/oversized input', () => {
  assert.throws(() => importOpenContentPack('{oops'), /invalid content pack JSON/);
  assert.throws(() => importOpenContentPack('x'.repeat(OPEN_CONTENT_PACK_LIMITS.maxBytes + 1)), /1 MiB/);
  assert.throws(() => importOpenContentPack({ ...sample, attribution: { title: 'No rights', creator: 'X' } }), /license/);
  assert.throws(() => importOpenContentPack({ ...sample, version: 2 }), /version/);
  assert.throws(() => importOpenContentPack({ ...sample, attribution: { ...sample.attribution, sourceUrl: 'javascript:alert(1)' } }), /HTTPS/);
});

test('V7.0 rejects duplicate, orphaned and incorrect-answer-key external content', () => {
  const dup = copy(sample); dup.questions.push({ ...dup.questions[0] });
  assert.throws(() => importOpenContentPack(dup), /duplicate question/);
  const orphan = copy(sample); orphan.questions[0].outcomeIds = ['missing'];
  assert.throws(() => importOpenContentPack(orphan), /unknown question outcome/);
  const wrong = copy(sample); wrong.questions[0].correctChoiceId = 'unknown';
  assert.throws(() => importOpenContentPack(wrong), /correct choice/);
  const cycle = copy(sample); cycle.outcomes[0].prerequisiteIds = ['compare-unit-fractions'];
  assert.throws(() => importOpenContentPack(cycle), /cyclic outcome/);
});

test('V7.0 treats third-party lesson text as inert strings; it does not execute or render it', () => {
  const unsafe = copy(sample);
  unsafe.lessons[0].bodyText = '<img src=x onerror=alert(1)>';
  const result = importOpenContentPack(unsafe);
  assert.equal(result.materials.lessons[0].bodyText, unsafe.lessons[0].bodyText);
  assert.equal(typeof result.materials.lessons[0].bodyText, 'string');
});
