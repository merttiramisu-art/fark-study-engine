import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard, getStudySummary, validateDeck } from '../src/index.js';
import { exportStudyDeck, importStudyDeck } from '../src/portable.js';

const T = '2026-11-13T12:00:00.000Z';
const card = id => createCard({ id, topic: 'Math', question: '2 + 3?', answer: '5' });

test('versioned portable deck keeps recorded reviews and mistake reasons', () => {
  const cards = [reviewCard(card('a'), 'again', T, { reason: 'knowledge-gap' }), card('b')];
  const text = exportStudyDeck(cards);
  const copy = importStudyDeck(text);
  assert.deepEqual(copy, cards);
  assert.deepEqual(getStudySummary(copy, T), getStudySummary(cards, T));
  copy[0].reasonCounts['knowledge-gap']++;
  assert.equal(cards[0].reasonCounts['knowledge-gap'], 1);
  assert.equal(JSON.parse(text).schemaVersion, 1);
});

test('imports v0.1 cards missing reasonCounts without inventing reasons', () => {
  const old = reviewCard(card('a'), 'again', T);
  delete old.reasonCounts;
  assert.deepEqual(importStudyDeck(exportStudyDeck([old])), [old]);
});

test('empty deck round-trip is valid', () => {
  assert.deepEqual(importStudyDeck(exportStudyDeck([])), []);
  assert.equal(validateDeck([]), true);
});

test('invalid JSON is reported clearly', () => {
  assert.throws(() => importStudyDeck('{nope}'), SyntaxError);
  assert.throws(() => importStudyDeck(null), TypeError);
  assert.throws(() => importStudyDeck('null'), TypeError);
  assert.throws(() => importStudyDeck('[]'), TypeError);
});

test('unknown versions and envelope keys are rejected', () => {
  const deck = JSON.parse(exportStudyDeck([card('a')]));
  for (const edit of [
    x => { x.schemaVersion = 99; },
    x => { x.format = 'different'; },
    x => { x.userEmail = 'private@example.org'; }
  ]) {
    const modified = structuredClone(deck);
    edit(modified);
    assert.throws(() => importStudyDeck(JSON.stringify(modified)), RangeError);
  }
});

test('unexpected card fields are rejected, not silently lost', () => {
  assert.throws(() => exportStudyDeck([{ ...card('x'), privateNotes: 'do not lose' }]), /unknown card field/);
  const d = JSON.parse(exportStudyDeck([card('x')]));
  d.cards[0].privateNotes = 'do not lose';
  assert.throws(() => importStudyDeck(JSON.stringify(d)), /unknown card field/);
});

test('corrupt counts and duplicate IDs are not imported', () => {
  assert.throws(() => exportStudyDeck([card('a'), card('a')]), /duplicate/);
  const d = JSON.parse(exportStudyDeck([card('a')]));
  d.cards[0].reviews = 7;
  assert.throws(() => importStudyDeck(JSON.stringify(d)), /inconsistent/);
});

test('unreasonable payload sizes are bounded', () => {
  assert.throws(() => importStudyDeck(' '.repeat(2_000_001)), /exceeds/);
  assert.throws(() => exportStudyDeck(Array.from({ length: 10_001 }, (_, i) => card(String(i)))), /exceeds/);
});

test('reason counts remain plain data after round-trip', () => {
  const reviewed = reviewCard(card('a'), 'again', T, { reason: 'attention' });
  const restored = importStudyDeck(exportStudyDeck([reviewed]));
  assert.equal(restored[0].reasonCounts.attention, 1);
  assert.deepEqual(Object.getPrototypeOf(restored[0].reasonCounts), Object.prototype);
});
