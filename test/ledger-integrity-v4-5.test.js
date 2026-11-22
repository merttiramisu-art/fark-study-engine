import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, upsertLedgerCard, recordLedgerReview, validateLedger, importLedger } from '../src/ledger.js';
import { recordIntervention } from '../src/diagnosis.js';

const T0 = '2026-01-01T12:00:00.000Z';
const D1 = '2026-01-02T12:00:00.000Z';
const D2 = '2026-01-03T12:00:00.000Z';
function seed() {
  const empty = createLedger({ createdAt: T0 });
  return upsertLedgerCard(empty, { id: 'one', topic: 'Arithmetic', question: '2 + 2?', answer: '4' });
}
function history() {
  const first = recordLedgerReview(seed(), 'one', 'good', T0).ledger;
  return recordLedgerReview(first, 'one', 'again', D2, { reason: 'knowledge-gap' }).ledger;
}
function altered(base, modify) {
  const copy = structuredClone(base);
  modify(copy);
  return copy;
}

test('V4.5 accepts valid interleaved observations and immutable JSON round trips', () => {
  const original = history();
  const text = JSON.stringify(original);
  assert.equal(validateLedger(original), true);
  assert.deepEqual(importLedger(text), original);
  const clone = structuredClone(original);
  assert.equal(validateLedger(clone), true);
  assert.equal(JSON.stringify(original), text);
});

test('V4.5 rejects duplicate, padded or missing event identifiers', () => {
  const original = history();
  for (const id of [original.events[0].id, ' padded ', '', null]) {
    const changed = altered(original, copy => { copy.events[1].id = id; });
    assert.throws(() => validateLedger(changed), /event|duplicate/i);
    assert.throws(() => importLedger(JSON.stringify(changed)), /event|duplicate/i);
  }
});

test('V4.5 rejects invalid ratings and mistake-reason inconsistencies', () => {
  const original = history();
  for (const rating of ['unknown', null, 42]) {
    assert.throws(() => validateLedger(altered(original, x => { x.events[1].rating = rating; })), /rating/i);
  }
  assert.throws(() => validateLedger(altered(original, x => { x.events[1].rating = 'good'; })), /reason/i);
  assert.throws(() => validateLedger(altered(original, x => { x.events[1].concepts = 'Arithmetic'; })), /concepts/i);
});

test('V4.5 rejects stale, reordered and inconsistent review-state fields', () => {
  const original = history();
  const cases = [
    x => { x.events[1].at = '2025-12-31T00:00:00.000Z'; },
    x => { x.events[1].memoryAfter = null; },
    x => { x.events[1].memoryAfter.reps = 900; },
    x => { x.events[1].memoryAfter.lapses = 0; },
    x => { x.events[1].memoryAfter.stabilityDays = -1; },
    x => { x.events[1].memoryAfter.lastReviewedAt = D1; },
    x => { x.events[1].predictedR = 1.5; },
    x => { x.events[1].intervalDays = -2; },
    x => { x.events[1].memoryAfter.dueAt = T0; }
  ];
  for (const mutate of cases) assert.throws(() => validateLedger(altered(original, mutate)));
});

test('V4.5 prevents duplicate review IDs without mutating valid history', () => {
  const original = history();
  const before = JSON.stringify(original);
  assert.throws(
    () => recordLedgerReview(original, 'one', 'good', D2, { eventId: original.events[0].id }),
    /duplicate event id/
  );
  assert.throws(
    () => recordLedgerReview(original, 'one', 'good', D2, { eventId: '  invalid  ' }),
    /canonical/
  );
  assert.equal(JSON.stringify(original), before);
  assert.equal(validateLedger(original), true);
});

test('V4.5 intervention ID collisions cannot corrupt the review ledger', () => {
  const original = history();
  const before = JSON.stringify(original);
  assert.throws(() => recordIntervention(original, {
    id: original.events[0].id,
    targetTopic: 'Arithmetic',
    action: 'Review an example'
  }, D2), /duplicate event id/);
  assert.equal(JSON.stringify(original), before);
});
