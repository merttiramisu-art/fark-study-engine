import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DSR_DEFAULTS,
  createMemoryState,
  computeRetrievability,
  computeOptimalIntervalDays,
  updateDsrMemory,
  evaluatePredictionCalibration
} from '../src/memory.js';

const T0 = '2026-01-01T09:00:00.000Z';
const addDays = (iso, days) => new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();

test('power-law retrievability equals 0.90 when elapsedDays equals stabilityDays', () => {
  assert.equal(computeRetrievability(0, 0), null);
  assert.equal(computeRetrievability(0, 5), 1);
  assert.equal(computeRetrievability(10, 10), 0.9);
  assert.equal(computeOptimalIntervalDays(12, 0.9), 12);
  assert.ok(computeOptimalIntervalDays(12, 0.95) < 12);
  assert.ok(computeOptimalIntervalDays(12, 0.8) > 12);
});

test('delayed successful recall builds more stability than premature easy review (spacing bonus)', () => {
  const init = updateDsrMemory(createMemoryState(), 'good', T0);
  const early = updateDsrMemory(init.state, 'good', addDays(T0, 0.5));
  const spaced = updateDsrMemory(init.state, 'good', addDays(T0, 3));

  assert.equal(init.predictedR, null);
  assert.ok(early.predictedR > spaced.predictedR);
  assert.ok(spaced.state.stabilityDays > early.state.stabilityDays);
});

test('attention lapses avoid difficulty/ease hell while misconception lapses sharply lower stability', () => {
  const s1 = updateDsrMemory(createMemoryState(), 'good', T0).state;
  const s2 = updateDsrMemory(s1, 'good', addDays(T0, 2)).state;

  const afterSlip = updateDsrMemory(s2, 'again', addDays(T0, 5), { reason: 'attention' }).state;
  const afterMisc = updateDsrMemory(s2, 'again', addDays(T0, 5), { reason: 'misconception' }).state;

  assert.ok(afterSlip.difficulty < afterMisc.difficulty);
  assert.ok(afterSlip.stabilityDays > afterMisc.stabilityDays);
  assert.ok(afterSlip.difficulty < 6.0);
});

test('evaluatePredictionCalibration computes Brier score, log loss, and excludes null predictions', () => {
  const report = evaluatePredictionCalibration([
    { predictedR: null, recalled: true },
    { predictedR: 0.9, recalled: true },
    { predictedR: 0.9, recalled: true },
    { predictedR: 0.1, recalled: false },
    { predictedR: 0.85, recalled: false }
  ]);
  assert.equal(report.sampleCount, 4);
  assert.equal(report.unscoredCount, 1);
  assert.ok(report.brierScore > 0 && report.brierScore < 0.25);
  assert.ok(report.logLoss > 0);
  assert.equal(report.bins[0].count, 1);
  assert.equal(report.bins[4].count, 3);
});

test('memory functions reject invalid timestamps, ratings, and thresholds', () => {
  const base = createMemoryState();
  assert.throws(() => updateDsrMemory(base, 'good', T0, { reason: 'attention' }), RangeError);
  assert.throws(() => updateDsrMemory(base, 'magic', T0), RangeError);
  assert.throws(() => updateDsrMemory(base, 'good', T0, { targetRetention: 0.4 }), RangeError);
  const next = updateDsrMemory(base, 'good', T0).state;
  assert.throws(() => updateDsrMemory(next, 'good', '2025-12-31T00:00:00Z'), RangeError);
  assert.equal(DSR_DEFAULTS.defaultDifficulty, 4.8);
});
