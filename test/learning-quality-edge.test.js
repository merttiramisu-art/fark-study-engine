import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportReviewLogCsv,
  fitLearnerParameters,
  parseReviewLogCsv,
  parseReviewLogJsonl,
  replayReviewStream
} from '../src/calibrate.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ORIGIN = Date.parse('2026-01-01T09:00:00.000Z');
const atDay = (day) => new Date(ORIGIN + day * DAY_MS).toISOString();

test('V5.2 empty review history does not invent measurements or fitted learning', () => {
  const report = replayReviewStream([]);
  assert.equal(report.totalEvents, 0);
  assert.equal(report.distinctCards, 0);
  for (const strategy of report.strategies) {
    assert.equal(strategy.sampleCount, 0);
    assert.equal(strategy.brierScore, null);
    assert.equal(strategy.logLoss, null);
  }
  const fit = fitLearnerParameters([]);
  assert.equal(fit.fitted, false);
  assert.equal(fit.holdout, null);
  assert.equal(fit.sampleCount, 0);
});

test('V5.2 first reviews on distinct cards are unscored, not evidence of mastery', () => {
  const events = Object.freeze([
    Object.freeze({ cardId: 'A', topic: 'Math', at: atDay(0), rating: 'easy' }),
    Object.freeze({ cardId: 'B', topic: 'Math', at: atDay(1), rating: 'good' }),
    Object.freeze({ cardId: 'C', topic: 'Science', at: atDay(2), rating: 'again', reason: 'knowledge-gap' })
  ]);
  const before = JSON.stringify(events);
  const report = replayReviewStream(events);
  for (const strategy of report.strategies) {
    assert.equal(strategy.sampleCount, 0);
    assert.equal(strategy.unscoredCount, events.length);
    assert.equal(strategy.brierScore, null);
  }
  const fit = fitLearnerParameters(events);
  assert.equal(fit.fitted, false);
  assert.equal(fit.holdout, null);
  assert.equal(JSON.stringify(events), before);
});

test('V5.2 long review gaps stay numerically bounded without inferring effectiveness', () => {
  const events = [
    { cardId: 'A', at: atDay(0), rating: 'good' },
    { cardId: 'A', at: atDay(365), rating: 'again', reason: 'knowledge-gap' },
    { cardId: 'A', at: atDay(366), rating: 'good' }
  ];
  const report = replayReviewStream(events);
  for (const strategy of report.strategies) {
    assert.equal(strategy.sampleCount, 2);
    assert.ok(Number.isFinite(strategy.brierScore) && strategy.brierScore >= 0 && strategy.brierScore <= 1);
    assert.ok(Number.isFinite(strategy.logLoss) && strategy.logLoss >= 0);
    assert.ok(strategy.meanPredictedR >= 0 && strategy.meanPredictedR <= 1);
  }
});

test('V5.2 chronological replay matches independent CSV and JSONL parses', () => {
  const events = [
    { cardId: 'A', topic: 'Math', at: atDay(6), rating: 'again', reason: 'misconception' },
    { cardId: 'A', topic: 'Math', at: atDay(0), rating: 'good' },
    { cardId: 'B', topic: 'Science', at: atDay(1), rating: 'easy' },
    { cardId: 'A', topic: 'Math', at: atDay(3), rating: 'hard' },
    { cardId: 'B', topic: 'Science', at: atDay(7), rating: 'good' }
  ];
  const source = replayReviewStream(events);
  const reversed = replayReviewStream([...events].reverse());
  const csv = replayReviewStream(parseReviewLogCsv(exportReviewLogCsv(events)));
  const jsonl = replayReviewStream(parseReviewLogJsonl(events.map(event => JSON.stringify(event)).join('\n')));
  assert.deepEqual(source, reversed);
  assert.deepEqual(source, csv);
  assert.deepEqual(source, jsonl);
  assert.equal(source.strategies[0].sampleCount, 3);
});

test('V5.2 chronological holdout is deterministic and separate from training score', () => {
  const events = Object.freeze(Array.from({ length: 24 }, (_, index) => Object.freeze({
    cardId: 'synthetic-learner-1',
    topic: 'Algebra',
    at: atDay(index),
    rating: index % 6 === 0 ? 'again' : 'good',
    ...(index > 0 && index % 6 === 0 ? { reason: 'knowledge-gap' } : {})
  })));
  const a = fitLearnerParameters(events);
  const b = fitLearnerParameters(events);
  assert.deepEqual(a, b);
  assert.equal(a.fitted, true);
  assert.equal(a.sampleCount, 23);
  assert.ok(a.holdout && a.holdout.sampleCount > 0);
  for (const field of ['baselineBrier', 'fittedBrier']) {
    assert.ok(Number.isFinite(a.holdout[field]));
    assert.ok(a.holdout[field] >= 0 && a.holdout[field] <= 1);
  }
  assert.equal(JSON.stringify(events), JSON.stringify([...events]));
});
