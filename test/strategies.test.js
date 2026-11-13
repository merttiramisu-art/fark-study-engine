import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard, validateDeck } from '../src/index.js';
import {
  STRATEGY_IDS,
  listReviewStrategies,
  getReviewStrategy,
  reviewCardWithStrategy,
  compareStrategies
} from '../src/strategies.js';

const NOW = '2026-11-13T12:00:00.000Z';

test('lists and retrieves independent strategy metadata copies', () => {
  const strategies = listReviewStrategies();
  assert.deepEqual(strategies.map(s => s.id), [...STRATEGY_IDS]);
  assert.match(strategies[0].disclaimer, /not|none|determin/i);
  strategies[0].intervalsDays.push(999);
  assert.equal(getReviewStrategy('balanced').intervalsDays.length, 7);
  assert.throws(() => getReviewStrategy('magic'), RangeError);
});

test('reviewCardWithStrategy preserves invariants while adjusting spacing by strategy', () => {
  const card = createCard({ id: 'c1', topic: 'Math', question: '2+2?', answer: '4' });
  const baseline = reviewCard(card, 'good', NOW);
  const balanced = reviewCardWithStrategy(card, 'good', NOW, { strategy: 'balanced' });
  const gentle = reviewCardWithStrategy(card, 'good', NOW, { strategy: 'gentle' });
  const intensive = reviewCardWithStrategy(card, 'good', NOW, { strategy: 'intensive' });

  assert.deepEqual(balanced, baseline);
  assert.equal(validateDeck([balanced, gentle, intensive].map((c, i) => ({ ...c, id: `v-${i}` }))), true);
  assert.equal(intensive.dueAt, '2026-11-14T00:00:00.000Z');
  assert.equal(gentle.dueAt, '2026-11-14T12:00:00.000Z');

  const box2Balanced = reviewCardWithStrategy(balanced, 'good', balanced.dueAt, { strategy: 'balanced' });
  const box2Gentle = reviewCardWithStrategy(gentle, 'good', gentle.dueAt, { strategy: 'gentle' });
  assert.ok(Date.parse(box2Balanced.dueAt) > Date.parse(box2Gentle.dueAt));

  const lapseIntensive = reviewCardWithStrategy(intensive, 'again', '2026-11-14T00:00:00.000Z', {
    strategy: 'intensive',
    reason: 'attention'
  });
  assert.equal(lapseIntensive.box, 0);
  assert.equal(lapseIntensive.dueAt, '2026-11-14T00:05:00.000Z');
  assert.equal(lapseIntensive.reasonCounts.attention, 1);
});

test('reviewCardWithStrategy rejects unknown options or strategies', () => {
  const card = createCard({ id: 'c1', topic: 'Math', question: '2+2?', answer: '4' });
  assert.throws(() => reviewCardWithStrategy(card, 'good', NOW, { strategy: 'unknown' }), RangeError);
  assert.throws(() => reviewCardWithStrategy(card, 'good', NOW, { extra: true }), RangeError);
  assert.throws(() => reviewCardWithStrategy(card, 'good', NOW, 'bad'), TypeError);
});

test('compareStrategies compares identical sequences deterministically', () => {
  const result = compareStrategies(
    ['good', 'good', { rating: 'again', reason: 'misconception' }, 'good', 'easy'],
    { startAt: NOW }
  );
  assert.equal(result.startedAt, NOW);
  assert.equal(result.strategies.length, 3);
  const [bal, gen, intv] = result.strategies;
  assert.equal(bal.strategy, 'balanced');
  assert.equal(gen.strategy, 'gentle');
  assert.equal(intv.strategy, 'intensive');
  assert.equal(bal.timeline.length, 5);
  assert.ok(bal.totalSpanDays > gen.totalSpanDays);
  assert.ok(gen.totalSpanDays > intv.totalSpanDays);
  assert.equal(bal.finalBox, intv.finalBox);
});

test('compareStrategies validates steps, options, and strategy selections', () => {
  assert.throws(() => compareStrategies([]), RangeError);
  assert.throws(() => compareStrategies('good'), RangeError);
  assert.throws(() => compareStrategies(['good'], { strategies: [] }), RangeError);
  assert.throws(() => compareStrategies(['good'], { strategies: ['bogus'] }), RangeError);
  assert.throws(() => compareStrategies([{ rating: 'good', bogus: 1 }]), RangeError);
  assert.throws(() => compareStrategies(['good'], { unknownOpt: true }), RangeError);
});
