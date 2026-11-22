import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importOpenContentPack } from '../src/content-adapter.js';
import { importMarkdownContentPack, MARKDOWN_CONTENT_LIMITS } from '../src/markdown-content.js';
import { createAssessmentHistory, recordAssessment } from '../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../src/learning-progress.js';
import { getLearningNextStep } from '../src/learning-orchestrator.js';
import { createReassessmentLedger, issueReassessment, verifyIssuedReassessment } from '../src/reassessment-ledger.js';

const md = readFileSync(fileURLToPath(new URL('../examples/content-packs/original-fractions.md', import.meta.url)), 'utf8');
const json = readFileSync(fileURLToPath(new URL('../examples/content-packs/original-fractions.json', import.meta.url)), 'utf8');
const replace = (before, after) => md.replace(before, after);

test('restricted Markdown and JSON content packs produce the same verified Knowledge Core', () => {
  const fromMarkdown = importMarkdownContentPack(md);
  assert.deepEqual(fromMarkdown, importOpenContentPack(json));
  assert.equal(fromMarkdown.core.questions.length, 2);
  assert.equal(fromMarkdown.core.resources[0].misconceptionIds[0], 'denominator-size');
  assert.equal(fromMarkdown.attribution.license, 'MIT');
  assert.deepEqual(importMarkdownContentPack('\uFEFF' + md.replace(/\n/g, '\r\n')), fromMarkdown);
});

test('Markdown source supports a full honest learning journey without inferred mastery', () => {
  const { core } = importMarkdownContentPack(md);
  let history = recordAssessment(core, createAssessmentHistory(), {
    attemptId: 'a1', questionId: 'baseline', selectedChoiceId: 'b',
    at: '2026-01-01T10:00:00.000Z'
  }).history;
  let teaching = createTeachingHistory();
  const recommendation = getLearningNextStep(core, history, teaching, {
    at: '2026-01-01T10:01:00.000Z', baselineAttemptId: 'a1',
    outcomeId: 'compare-unit-fractions'
  });
  assert.equal(recommendation.status, 'teaching-needed');
  assert.equal(recommendation.resources[0].resourceId, 'fraction-pieces');
  teaching = recordTeachingCompletion(core, history, teaching, {
    completionId: 'c1', resourceId: 'fraction-pieces',
    baselineAttemptId: 'a1', at: '2026-01-01T10:05:00.000Z'
  }).history;
  const issued = issueReassessment(core, history, teaching, createReassessmentLedger(), {
    issueId: 'i1', baselineAttemptId: 'a1',
    outcomeId: 'compare-unit-fractions', at: '2026-01-01T10:10:00.000Z'
  });
  assert.equal(issued.issue.questionId, 'followup');
  history = recordAssessment(core, history, {
    attemptId: 'a2', questionId: 'followup', selectedChoiceId: 'a',
    at: '2026-01-01T10:12:00.000Z'
  }).history;
  const verified = verifyIssuedReassessment(core, history, issued.ledger, {
    issueId: 'i1', followupAttemptId: 'a2', at: '2026-01-01T10:13:00.000Z'
  });
  assert.equal(verified.status, 'verified-issued-answer');
  assert.equal(verified.comparison.followupCorrect, true);
  assert.equal(verified.mastery, null);
});

test('Markdown is a restricted authoring grammar, not permissive or executable MDX', () => {
  const cases = [
    [replace('# FARK Content Pack', '# Unknown Pack'), /start with/i],
    [replace('version: 1', 'version: 2'), /version/i],
    [replace('license: MIT', 'copyright-notice: undefined'), /unsupported document/i],
    [replace('license: MIT', 'license: MIT\nlicense: MIT'), /duplicate document.license/i],
    [replace('## Unit: fractions', '## Other: fractions'), /unsupported section/i],
    [replace('## Outcome: compare-unit-fractions', '## Outcome: compare-unit-fractions\nrandom text'), /unsupported Outcome field/i],
    [replace('- b | 1/4 | misconception=denominator-size', '- b : 1/4'), /invalid question choice/i],
    [replace('- b | 1/4 | misconception=denominator-size', '- a | 1/4'), /duplicate choice/i],
    [replace('correctChoiceId: a', 'correctChoiceId: missing'), /correct choice missing/i],
    [replace('outcomeIds: compare-unit-fractions', 'outcomeIds: orphan'), /unknown .* outcome/i],
    [replace('sourceUrl: https://', 'sourceUrl: javascript:'), /HTTPS/i]
  ];
  for (const [input, expectation] of cases) {
    assert.throws(() => importMarkdownContentPack(input), expectation);
  }
});

test('Markdown limits reject oversized bytes and too many lines', () => {
  assert.throws(() => importMarkdownContentPack('a'.repeat(MARKDOWN_CONTENT_LIMITS.maxBytes + 1)), /1 MiB/);
  assert.throws(
    () => importMarkdownContentPack('# FARK Content Pack\n' + '\n'.repeat(MARKDOWN_CONTENT_LIMITS.maxLines + 1)),
    /too many lines/
  );
  assert.throws(() => importMarkdownContentPack(replace('license: MIT', 'license:   ')), /empty .*license/i);
});

test('Markdown lesson text with tags is inert; import does not evaluate or render it', () => {
  const suspicious = '<img src=x onerror=alert(1)>';
  const body = '### Body\n';
  const modified = replace(body, body + suspicious + '\n');
  const result = importMarkdownContentPack(modified);
  assert.ok(result.materials.lessons[0].bodyText.includes(suspicious));
  assert.equal(result.core.questions.length, 2);
});

test('Markdown supports explicit card mappings without silently dropping source content', () => {
  const input = md + '\n## Mapping: flash-1\nquestionId: baseline\n';
  const result = importMarkdownContentPack(input);
  assert.deepEqual(result.core.mappings, [{ cardId: 'flash-1', questionId: 'baseline' }]);
  assert.throws(() => importMarkdownContentPack(input + '\n## Mapping: flash-1\nquestionId: followup\n'), /duplicate mapping/);
});
