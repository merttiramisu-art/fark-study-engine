import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_CORE_MARKDOWN,
  parseMarkdownToKnowledgeCore,
  parseCsvToKnowledgeCore
} from '../src/core-adapter.js';

test('parseMarkdownToKnowledgeCore parses both EN and TR templates into 100%-ready Knowledge Cores', () => {
  for (const lang of ['en', 'tr']) {
    const result = parseMarkdownToKnowledgeCore(SAMPLE_CORE_MARKDOWN[lang]);
    assert.equal(result.core.format, 'fark-knowledge-core');
    assert.equal(result.core.version, 1);
    assert.equal(result.stats.units, 1);
    assert.equal(result.stats.outcomes, 2);
    assert.equal(result.stats.questions, 4);
    assert.equal(result.stats.resources, 2);
    assert.equal(result.readiness.summary.ready, 2);
    assert.equal(result.warnings.length, 0);

    // Second outcome depends on first outcome
    const [first, second] = result.core.outcomes;
    assert.deepEqual(second.prerequisiteIds, [first.id]);

    // Misconception tags preserved on distractors
    const taggedChoices = result.core.questions.flatMap(q => q.choices).filter(c => c.misconceptionId);
    assert.ok(taggedChoices.length >= 3);
  }
});

test('parseMarkdownToKnowledgeCore rejects empty text and prerequisite cycles cleanly', () => {
  assert.throws(() => parseMarkdownToKnowledgeCore('   '), TypeError);

  const cyclic = `# Unit: Loop
## Outcome: Alpha
Prereq: Beta
Q: First?
* Yes
- No
## Outcome: Beta
Prereq: Alpha
Q: Second?
* Yes
- No`;
  assert.throws(() => parseMarkdownToKnowledgeCore(cyclic), /cyclic/i);
});

test('parseCsvToKnowledgeCore parses quoted CSV rows into a validated Knowledge Core', () => {
  const csv = `unit,outcome,prerequisite,question,choice_a,choice_b,choice_c,correct,misconception,lesson_summary,wrong_intuition,right_principle
"Stats, Basics",Median,,Which resists outliers?,Median,Mean,Sum,a,outlier-bias,"Median splits sorted values in half.","Mean is always typical.","Check median on skewed data."
"Stats, Basics",Median,,"In [1, 2, 3, 4, 400] which is 3?",Median,Mean,Max,a,outlier-bias,"Median splits sorted values in half.","Mean is always typical.","Check median on skewed data."`;

  const result = parseCsvToKnowledgeCore(csv);
  assert.equal(result.stats.units, 1);
  assert.equal(result.stats.outcomes, 1);
  assert.equal(result.stats.questions, 2);
  assert.equal(result.stats.resources, 1);
  assert.equal(result.readiness.summary.ready, 1);

  assert.throws(() => parseCsvToKnowledgeCore('only,bad,headers\n1,2,3'), RangeError);
});
