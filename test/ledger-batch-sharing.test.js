import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createCard } from '../src/index.js';
import {
  createLedger,
  recordLedgerReview,
  recordLedgerReviewsBatch,
  validateLedger,
  getCardMemoryState
} from '../src/ledger.js';

const T0 = '2026-02-01T08:00:00.000Z';

test('structural-sharing recordLedgerReview preserves strict immutability and supports branching', () => {
  const cards = [
    createCard({ id: 'c1', topic: 'Math', question: 'Q1', answer: 'A1' }),
    createCard({ id: 'c2', topic: 'Logic', question: 'Q2', answer: 'A2' })
  ];
  const base = createLedger({ createdAt: T0, cards });
  assert.equal(Object.isFrozen(base), true);
  assert.equal(Object.isFrozen(base.events), true);

  const step1 = recordLedgerReview(base, 'c1', 'good', '2026-02-02T08:00:00.000Z').ledger;
  // Branch two different histories from the same snapshot `step1`
  const branchA = recordLedgerReview(step1, 'c1', 'easy', '2026-02-05T08:00:00.000Z', { eventId: 'branch-a' }).ledger;
  const branchB = recordLedgerReview(step1, 'c1', 'again', '2026-02-05T08:00:00.000Z', { eventId: 'branch-b', reason: 'misconception' }).ledger;

  assert.equal(base.events.length, 0);
  assert.equal(step1.events.length, 1);
  assert.equal(branchA.events.length, 2);
  assert.equal(branchB.events.length, 2);
  assert.ok(getCardMemoryState(branchA, 'c1').stabilityDays > getCardMemoryState(branchB, 'c1').stabilityDays);
  assert.equal(validateLedger(branchA), true);
  assert.equal(validateLedger(branchB), true);
});

test('recordLedgerReviewsBatch matches sequential appends identically and rejects invalid batches atomically', () => {
  const cards = [
    createCard({ id: 'c1', topic: 'Math', question: 'Q1', answer: 'A1' }),
    createCard({ id: 'c2', topic: 'Logic', question: 'Q2', answer: 'A2' })
  ];
  const base = createLedger({ createdAt: T0, cards });
  const batch = [
    { cardId: 'c1', rating: 'good', at: '2026-02-02T08:00:00.000Z' },
    { cardId: 'c2', rating: 'again', at: '2026-02-02T09:00:00.000Z', reason: 'misconception' },
    { cardId: 'c1', rating: 'easy', at: '2026-02-05T08:00:00.000Z' }
  ];

  let seq = base;
  for (const r of batch) {
    seq = recordLedgerReview(seq, r.cardId, r.rating, r.at, r.reason ? { reason: r.reason } : {}).ledger;
  }
  const batched = recordLedgerReviewsBatch(base, batch);
  assert.deepEqual(batched.ledger, seq);
  assert.equal(batched.events.length, 3);

  // Atomic rejection on bad item leaves input untouched
  const beforeLen = batched.ledger.events.length;
  assert.throws(() => recordLedgerReviewsBatch(batched.ledger, [
    { cardId: 'c1', rating: 'good', at: '2026-02-06T08:00:00.000Z' },
    { cardId: 'missing-card', rating: 'good', at: '2026-02-07T08:00:00.000Z' }
  ]), RangeError);
  assert.equal(batched.ledger.events.length, beforeLen);
});

test('structural sharing runs 1,000 sequential recordLedgerReview appends well under 500ms', () => {
  const cards = Array.from({ length: 20 }, (_, i) =>
    createCard({ id: `perf-${i}`, topic: 'Perf', question: `Q${i}`, answer: `A${i}` })
  );
  let ledger = createLedger({ createdAt: T0, cards });
  let ts = Date.parse(T0);
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    ts += 3_600_000;
    ledger = recordLedgerReview(ledger, `perf-${i % 20}`, i % 5 === 0 ? 'again' : 'good', new Date(ts).toISOString()).ledger;
  }
  const elapsed = performance.now() - start;
  assert.equal(ledger.events.length, 1000);
  assert.ok(elapsed < 500, `Expected 1000 sequential appends < 500ms, got ${elapsed.toFixed(1)}ms`);
});
