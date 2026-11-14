import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard, validateDeck } from '../src/index.js';
import {
  LEDGER_FORMAT,
  createLedger,
  validateLedger,
  linkConceptPrerequisites,
  upsertLedgerCard,
  getCardMemoryState,
  recordLedgerReview,
  projectCardsFromLedger,
  exportLedger,
  importLedger
} from '../src/ledger.js';

const T0 = '2026-01-01T09:00:00.000Z';
const addDays = (iso, days) => new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();

test('createLedger seeds existing cards without fabricating events and prevents prerequisite cycles', () => {
  const existing = reviewCard(
    createCard({ id: 'c1', topic: 'Quadratics', question: 'Solve x^2=9', answer: '3 or -3' }),
    'again',
    T0,
    { reason: 'misconception' }
  );
  let ledger = createLedger({
    createdAt: T0,
    cards: [existing],
    concepts: [{ id: 'Linear', prerequisites: [] }, { id: 'Quadratics', prerequisites: ['Linear'] }]
  });
  assert.equal(ledger.format, LEDGER_FORMAT);
  assert.equal(ledger.events.length, 0);
  assert.equal(validateLedger(ledger), true);

  ledger = linkConceptPrerequisites(ledger, 'Calculus', ['Quadratics']);
  assert.throws(() => linkConceptPrerequisites(ledger, 'Linear', ['Calculus']), RangeError);

  const projected = projectCardsFromLedger(ledger, addDays(T0, 1));
  assert.equal(projected.length, 1);
  assert.equal(projected[0].lapses, 1);
  assert.equal(projected[0].reasonCounts.misconception, 1);
});

test('recordLedgerReview tracks elapsedDays, predictedR, and projects compatible StudyCard decks', () => {
  let ledger = createLedger({ createdAt: T0 });
  ledger = upsertLedgerCard(ledger, { id: 'm1', topic: 'Math', question: '2+2?', answer: '4' }, { at: T0 });

  const step1 = recordLedgerReview(ledger, 'm1', 'good', T0);
  ledger = step1.ledger;
  assert.equal(step1.event.predictedR, null);
  assert.equal(step1.event.elapsedDays, 0);

  const step2 = recordLedgerReview(ledger, 'm1', 'good', addDays(T0, 2));
  ledger = step2.ledger;
  assert.equal(step2.event.elapsedDays, 2);
  assert.ok(step2.event.predictedR > 0.8 && step2.event.predictedR < 0.99);
  assert.ok(getCardMemoryState(ledger, 'm1').stabilityDays > step1.memory.stabilityDays);

  const projected = projectCardsFromLedger(ledger, addDays(T0, 2));
  assert.equal(validateDeck(projected), true);
  assert.equal(projected[0].reviews, 2);
  assert.equal(projected[0].correct, 2);

  const json = exportLedger(ledger);
  const restored = importLedger(json);
  assert.deepEqual(restored, ledger);
  assert.throws(() => importLedger('{"format":"wrong"}'), RangeError);
});
