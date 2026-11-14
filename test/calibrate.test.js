import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../src/index.js';
import { createLedger, recordLedgerReview } from '../src/ledger.js';
import { updateDsrMemory, createMemoryState } from '../src/memory.js';
import {
  exportReviewLogCsv,
  fitLearnerParameters,
  normalizeReviewEvents,
  parseReviewLogCsv,
  parseReviewLogJsonl,
  replayReviewStream
} from '../src/calibrate.js';

function addDays(baseIso, days) {
  return new Date(Date.parse(baseIso) + days * 24 * 60 * 60 * 1000).toISOString();
}

test('parseReviewLogCsv and parseReviewLogJsonl parse chronologically and enforce bounds', () => {
  const csv = [
    '\uFEFFcardId,topic,at,rating,reason',
    'eng-2,English: Tenses,2026-10-05T09:00:00Z,again,misconception',
    'eng-1,English: Core Verbs,2026-10-01T09:00:00Z,good,'
  ].join('\r\n');
  const parsed = parseReviewLogCsv(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].cardId, 'eng-1');
  assert.equal(parsed[1].reason, 'misconception');

  const jsonl = [
    '{"cardId":"eng-1","at":"2026-10-01T09:00:00Z","rating":"good"}',
    '{"cardId":"eng-2","at":"2026-10-03T09:00:00Z","rating":"again","reason":"attention"}'
  ].join('\n');
  const parsedJsonl = parseReviewLogJsonl(jsonl);
  assert.equal(parsedJsonl.length, 2);
  assert.equal(parsedJsonl[1].reason, 'attention');

  const outCsv = exportReviewLogCsv([{ cardId: '=evil', at: '2026-10-01T09:00:00Z', rating: 'good' }]);
  assert.match(outCsv, /'=evil/);

  assert.throws(() => parseReviewLogCsv('cardId,at\n1,2026-01-01'), RangeError);
  assert.throws(() => parseReviewLogCsv('cardId,at,rating\na,2026-01-01T00:00:00Z,bad'), RangeError);
  assert.throws(() => parseReviewLogJsonl('{broken'), SyntaxError);
});

test('replayReviewStream compares Balanced, SM-2, and DSR on ledger and external logs', () => {
  const cards = [
    createCard({ id: 'eng-v1', topic: 'English: Core Verbs', question: 'go → went → ?', answer: 'gone' }),
    createCard({ id: 'eng-t1', topic: 'English: Tenses', question: 'since vs for?', answer: 'point vs duration' }),
    createCard({ id: 'eng-c1', topic: 'English: Conditionals', question: 'If I had left...', answer: 'would have caught' })
  ];
  let ledger = createLedger({ cards, createdAt: '2026-10-01T08:00:00Z' });
  const seq = [
    ['eng-v1', 'good', 0],
    ['eng-t1', 'again', 0, 'misconception'],
    ['eng-v1', 'good', 2],
    ['eng-t1', 'hard', 2],
    ['eng-c1', 'again', 3, 'misconception'],
    ['eng-t1', 'good', 5],
    ['eng-v1', 'easy', 6],
    ['eng-c1', 'good', 7],
    ['eng-t1', 'good', 10],
    ['eng-c1', 'good', 11]
  ];
  for (const [id, rating, day, reason] of seq) {
    ledger = recordLedgerReview(ledger, id, rating, addDays('2026-10-01T09:00:00Z', day), reason ? { reason } : {}).ledger;
  }

  const events = normalizeReviewEvents(ledger);
  assert.equal(events.length, 10);

  const report = replayReviewStream(ledger);
  assert.equal(report.totalEvents, 10);
  assert.equal(report.distinctCards, 3);
  assert.deepEqual(report.strategies.map((s) => s.strategy), ['balanced', 'sm2', 'dsr']);
  for (const entry of report.strategies) {
    assert.equal(entry.sampleCount, 7);
    assert.ok(entry.brierScore >= 0 && entry.brierScore <= 1);
  }
});

test('fitLearnerParameters rejects small history honestly and calibrates fast-forgetting learner', () => {
  const shortRes = fitLearnerParameters([
    { cardId: 'a', at: '2026-10-01T09:00:00Z', rating: 'good' },
    { cardId: 'a', at: '2026-10-02T09:00:00Z', rating: 'good' }
  ]);
  assert.equal(shortRes.fitted, false);
  assert.equal(shortRes.reason, 'insufficient-scored-reviews');

  // Generate 36 deterministic events for a fast-forgetting English learner (true initialStabilityScale = 0.45, stabilityGainScale = 0.55)
  const start = '2026-09-01T09:00:00Z';
  const trueParams = { initialStabilityScale: 0.45, stabilityGainScale: 0.55 };
  const events = [];
  for (let c = 0; c < 6; c++) {
    const cardId = `eng-${c + 1}`;
    let mem = createMemoryState();
    let day = 0;
    for (let step = 0; step < 6; step++) {
      // Simulate repeated gaps where fast-forgetting learner struggles more than default DSR predicts.
      const prevGap = step === 0 ? 0 : 1 + (step % 3) * 2;
      day += prevGap;
      let rating = 'good';
      let reason;
      if (step === 1 && c % 2 === 0) {
        rating = 'again';
        reason = 'misconception';
      } else if (step === 2 && c < 4) {
        rating = 'again';
        reason = 'knowledge-gap';
      } else if (step === 4 && c < 3) {
        rating = 'again';
      }
      const res = updateDsrMemory(mem, rating, addDays(start, day), {
        ...(reason ? { reason } : {}),
        params: trueParams
      });
      mem = res.state;
      events.push({
        cardId,
        topic: 'English: Tenses',
        at: addDays(start, day),
        rating,
        ...(reason ? { reason } : {})
      });
    }
  }

  const fit = fitLearnerParameters(events);
  assert.equal(fit.fitted, true);
  assert.equal(fit.improved, true);
  assert.ok(fit.brierDelta < 0, `expected calibrated Brier < baseline (delta=${fit.brierDelta})`);
  assert.ok(
    fit.params.initialStabilityScale < 1.0 || fit.params.stabilityGainScale < 1.0,
    'expected faster forgetting profile scales < 1.0'
  );
  assert.ok(fit.holdout && fit.holdout.sampleCount > 0, 'expected chronological holdout validation on >=20 events');
});
