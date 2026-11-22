import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIDENCE_LEVELS,
  CONFIDENCE_PROBABILITY,
  classifyConfidenceOutcome,
  analyzeMetacognitiveCalibration,
  forecastForgettingHorizon
} from '../src/metacognition.js';

test('classifyConfidenceOutcome flags hypercorrection alerts and lucky guesses accurately', () => {
  assert.deepEqual(CONFIDENCE_LEVELS, ['low', 'medium', 'high']);
  assert.equal(CONFIDENCE_PROBABILITY.high, 0.9);
  assert.equal(classifyConfidenceOutcome('high', false), 'hypercorrection-alert');
  assert.equal(classifyConfidenceOutcome('low', true), 'lucky-guess');
  assert.equal(classifyConfidenceOutcome('high', true), 'calibrated-high');
  assert.equal(classifyConfidenceOutcome('low', false), 'acknowledged-gap');
  assert.equal(classifyConfidenceOutcome('medium', true), 'developing-correct');
  assert.equal(classifyConfidenceOutcome('medium', false), 'developing-miss');
  assert.throws(() => classifyConfidenceOutcome('extreme', true), RangeError);
  assert.throws(() => classifyConfidenceOutcome('high', 'yes'), TypeError);
});

test('analyzeMetacognitiveCalibration computes ECE, Brier score, bias, and hypercorrection outcomes', () => {
  const empty = analyzeMetacognitiveCalibration([]);
  assert.equal(empty.totalRecords, 0);
  assert.equal(empty.ece, null);
  assert.equal(empty.biasLabel, 'insufficient-data');

  const overconfident = analyzeMetacognitiveCalibration([
    { confidence: 'high', correct: false, outcomeId: 'out-1' },
    { confidence: 'high', correct: false, outcomeId: 'out-2' },
    { confidence: 'high', correct: true, outcomeId: 'out-1' },
    { confidence: 'low', correct: true, outcomeId: 'out-3' }
  ]);
  assert.equal(overconfident.totalRecords, 4);
  assert.equal(overconfident.hypercorrectionCount, 2);
  assert.equal(overconfident.luckyGuessCount, 1);
  assert.deepEqual(overconfident.hypercorrectionOutcomes, ['out-1', 'out-2']);
  assert.deepEqual(overconfident.luckyGuessOutcomes, ['out-3']);
  assert.equal(overconfident.biasLabel, 'overconfident');
  assert.ok(overconfident.ece > 0.3 && overconfident.ece <= 1);
  assert.ok(overconfident.brierScore > 0 && overconfident.brierScore <= 1);
  assert.match(overconfident.limitations, /not psychometric proof/i);
});

test('forecastForgettingHorizon projects 14-day decay and what-if study reduction cleanly', () => {
  const items = [
    { id: 'c1', label: 'Concept 1', stabilityDays: 1.5, elapsedDays: 1 },
    { id: 'c2', label: 'Concept 2', stabilityDays: 4.0, elapsedDays: 3 },
    { id: 'c3', label: 'Concept 3', stabilityDays: 6.0, elapsedDays: 0 },
    { id: 'c4', label: 'Concept 4', stabilityDays: 14.0, elapsedDays: 0 }
  ];

  const report = forecastForgettingHorizon(items, {
    horizonDays: 14,
    retentionThreshold: 0.90,
    simulateTodayReviews: 2,
    at: '2026-06-01T10:00:00.000Z'
  });

  assert.equal(report.days.length, 15);
  assert.equal(report.itemCount, 4);
  assert.equal(report.days[0].dayOffset, 0);
  assert.equal(report.days[14].dayOffset, 14);
  // Decay is monotonic without new study
  for (let i = 1; i < report.days.length; i++) {
    assert.ok(report.days[i].atRiskCount >= report.days[i - 1].atRiskCount);
  }
  // Studying top 2 urgent items today reduces at-risk load during the horizon
  const midDay = report.days[4];
  assert.ok(midDay.simulatedAtRiskCount <= midDay.atRiskCount);
  assert.ok(report.avoidedAtRiskAtDay7 >= 1);
  assert.ok(report.totalRiskDaysAvoided > 0);
  assert.throws(() => forecastForgettingHorizon(items, { horizonDays: 0 }), RangeError);
  assert.throws(() => forecastForgettingHorizon(items, { simulateTodayReviews: -1 }), RangeError);
});
