import test from 'node:test';
import assert from 'node:assert/strict';
import { fitLearnerParameters } from '../src/calibrate.js';

const ORIGIN = Date.parse('2026-02-01T09:00:00.000Z');
const at = index => new Date(ORIGIN + index * 86400000).toISOString();

function makeEvents(tailRating) {
  return Array.from({ length: 30 }, (_, index) => {
    const rating = index < 21
      ? (index % 5 === 0 ? 'again' : 'good')
      : tailRating;
    return {
      cardId: 'synthetic-memory-card',
      topic: 'Original synthetic algebra',
      at: at(index),
      rating,
      ...(rating === 'again' ? { reason: 'knowledge-gap' } : {})
    };
  });
}

test('V5.2 holdout uses prefix-only fitted parameters, not future rating labels', () => {
  const goodTail = makeEvents('good');
  const badTail = makeEvents('again');
  const untouchedA = JSON.stringify(goodTail);
  const untouchedB = JSON.stringify(badTail);
  const resultA = fitLearnerParameters(goodTail);
  const resultB = fitLearnerParameters(badTail);
  const prefixFit = fitLearnerParameters(goodTail.slice(0, 21));

  assert.equal(resultA.fitted, true);
  assert.equal(resultB.fitted, true);
  assert.ok(resultA.holdout);
  assert.ok(resultB.holdout);
  assert.equal(resultA.holdout.trainingEvents, 21);
  assert.equal(resultA.holdout.evaluationEvents, 9);
  assert.equal(resultA.holdout.trainingEndAt, at(20));
  assert.equal(resultA.holdout.evaluationStartAt, at(21));
  assert.deepEqual(resultA.holdout.trainingParams, prefixFit.params);
  assert.deepEqual(resultB.holdout.trainingParams, prefixFit.params);
  assert.ok(resultA.holdout.sampleCount > 0);
  assert.ok(resultB.holdout.sampleCount > 0);
  assert.equal(JSON.stringify(goodTail), untouchedA);
  assert.equal(JSON.stringify(badTail), untouchedB);
});

test('V5.2 held-out Brier comparison is explicitly separate from in-sample improvement', () => {
  const report = fitLearnerParameters(makeEvents('again'));
  assert.ok(report.holdout);
  const { baselineBrier, fittedBrier, brierDelta, outperformedBaseline } = report.holdout;
  assert.ok(Number.isFinite(baselineBrier));
  assert.ok(Number.isFinite(fittedBrier));
  assert.equal(brierDelta, Math.round((fittedBrier - baselineBrier) * 10000) / 10000);
  assert.equal(outperformedBaseline, fittedBrier < baselineBrier);
  assert.equal(typeof report.improved, 'boolean');
  assert.equal(typeof outperformedBaseline, 'boolean');
});

test('V5.2 sparse history does not fabricate a chronological holdout', () => {
  const tiny = makeEvents('good').slice(0, 4);
  const report = fitLearnerParameters(tiny);
  assert.equal(report.holdout, null);
  assert.equal(report.fitted, false);
});
