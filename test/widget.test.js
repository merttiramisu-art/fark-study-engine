import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard } from '../src/index.js';
import { FarkStudyDeckElement, registerFarkWidget, renderWidgetSnapshot } from '../src/widget.js';

const NOW = '2026-11-13T12:00:00.000Z';

test('widget module imports safely in Node without DOM and returns false on registerFarkWidget', () => {
  assert.equal(typeof FarkStudyDeckElement, 'function');
  assert.equal(registerFarkWidget(), false);
});

test('renderWidgetSnapshot builds summary, plan, and active cloze-parsed card view', () => {
  const cards = [
    createCard({ id: 'c1', topic: 'CS', question: 'A stack is {{LIFO}}.', answer: 'LIFO' }),
    reviewCard(createCard({ id: 'c2', topic: 'CS', question: 'Done', answer: 'Done' }), 'easy', NOW)
  ];
  const snapshot = renderWidgetSnapshot(cards, NOW);
  assert.equal(snapshot.summary.total, 2);
  assert.equal(snapshot.summary.due, 1);
  assert.equal(snapshot.plan.plannedCount, 1);
  assert.equal(snapshot.activeCard.id, 'c1');
  assert.equal(snapshot.activeCard.isCloze, true);
  assert.equal(snapshot.activeCard.maskedQuestion, 'A stack is [ ___ ].');
  assert.equal(snapshot.activeCard.revealedText, 'A stack is LIFO.');

  const empty = renderWidgetSnapshot([], NOW);
  assert.equal(empty.activeCard, null);
  assert.equal(empty.summary.total, 0);
});
