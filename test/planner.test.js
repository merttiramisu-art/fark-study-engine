import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard } from '../src/index.js';
import { planStudySession, getStudyRecommendations } from '../src/planner.js';

const NOW = '2026-11-13T12:00:00Z';
const card = (id, topic = 'Math') => createCard({
  id, topic, question: `Original question ${id}?`, answer: 'Answer'
});
const due = (id, topic = 'Math', rating = 'again') =>
  reviewCard(card(id, topic), rating, '2026-11-12T12:00:00Z');

test('empty deck explains no available work', () => {
  assert.deepEqual(planStudySession([], NOW), {
    planned: [], dueCount: 0, plannedCount: 0,
    deferredCount: 0, newCardsPlanned: 0, perTopic: {}
  });
});

test('never-reviewed cards are selected with explicit reason codes', () => {
  const r = planStudySession([card('first')], NOW);
  assert.equal(r.planned[0].status, 'new');
  assert.deepEqual(r.planned[0].reasonCodes, ['new-card']);
  assert.equal(r.newCardsPlanned, 1);
});

test('non-due cards never enter the session', () => {
  const future = reviewCard(card('future'), 'easy', NOW);
  assert.equal(planStudySession([future], NOW).dueCount, 0);
  assert.equal(planStudySession([future], '2026-11-17T12:00:00Z').dueCount, 1);
});

test('due cards with previous mistakes explain priority', () => {
  const r = planStudySession([due('mistake')], NOW);
  assert.equal(r.planned[0].status, 'review');
  assert.equal(r.planned[0].previousMistakes, 1);
  assert.deepEqual(r.planned[0].reasonCodes, ['scheduled-review', 'overdue', 'previous-mistakes']);
});

test('one topic cannot monopolize a multi-topic session', () => {
  const cards = [due('a1', 'A'), due('a2', 'A'), due('a3', 'A'), due('b1', 'B'), due('b2', 'B')];
  const r = planStudySession(cards, NOW, { limit: 4, maxPerTopic: 10 });
  assert.deepEqual(r.planned.map(x => x.topic), ['A', 'B', 'A', 'B']);
  assert.equal(r.deferredCount, 1);
});

test('caps total work and per-topic work', () => {
  const cards = [due('a1', 'A'), due('a2', 'A'), due('b1', 'B'), due('b2', 'B')];
  const r = planStudySession(cards, NOW, { limit: 10, maxPerTopic: 1 });
  assert.deepEqual(r.planned.map(x => x.id), ['a1', 'b1']);
  assert.equal(r.deferredCount, 2);
  assert.deepEqual(r.perTopic, { A: 1, B: 1 });
});

test('new-card cap does not hide due review cards', () => {
  const cards = [card('new1'), card('new2'), due('old1')];
  const r = planStudySession(cards, NOW, { maxNewCards: 1 });
  assert.deepEqual(r.planned.map(x => x.id), ['old1', 'new1']);
  assert.equal(r.newCardsPlanned, 1);
  assert.equal(r.deferredCount, 1);
});

test('zero limits return predictable empty plans, not infinite loops', () => {
  const cards = [due('a'), card('n')];
  for (const opts of [{ limit: 0 }, { maxPerTopic: 0 }]) {
    const r = planStudySession(cards, NOW, opts);
    assert.equal(r.plannedCount, 0);
    assert.equal(r.deferredCount, 2);
  }
  const r = planStudySession(cards, NOW, { maxNewCards: 0 });
  assert.deepEqual(r.planned.map(x => x.id), ['a']);
});

test('respects existing mistake-first priority inside each topic', () => {
  const high = reviewCard(due('high'), 'again', '2026-11-12T12:15:00Z');
  const low = due('low');
  const r = planStudySession([low, high], NOW);
  assert.deepEqual(r.planned.map(x => x.id), ['high', 'low']);
});

test('deterministic output independent of input order', () => {
  const cards = [due('b1', 'Beta'), due('a1', 'Alpha'), card('a2', 'Alpha')];
  assert.deepEqual(planStudySession(cards, NOW), planStudySession(cards.slice().reverse(), NOW));
});

test('does not mutate original cards or card order', () => {
  const cards = [due('b1', 'Beta'), card('a1')];
  const snapshot = structuredClone(cards);
  planStudySession(cards, NOW);
  assert.deepEqual(cards, snapshot);
});

test('rejects invalid options and deck state', () => {
  const cards = [card('a')];
  for (const options of [{ limit: -1 }, { maxPerTopic: 1.2 }, { maxNewCards: Infinity }, { mystery: 1 }, []]) {
    assert.throws(() => planStudySession(cards, NOW, options));
  }
  assert.throws(() => planStudySession([card('a'), card('a')], NOW), /duplicate/);
  assert.throws(() => planStudySession(cards, 'invalid-date'), /date/);
});

test('never overstates selection even for hundreds of cards', () => {
  const cards = Array.from({ length: 300 }, (_, i) => i % 3 === 0
    ? card(`n-${i}`, `T-${i%11}`)
    : due(`r-${i}`, `T-${i%11}`));
  const r = planStudySession(cards, NOW, { limit: 35, maxPerTopic: 4, maxNewCards: 8 });
  assert.equal(r.dueCount, 300);
  assert.equal(r.plannedCount, 35);
  assert.equal(r.deferredCount, 265);
  assert.ok(r.newCardsPlanned <= 8);
  assert.ok(Object.values(r.perTopic).every(n => n <= 4));
  assert.equal(new Set(r.planned.map(x => x.id)).size, 35);
});

test('reasonAware elevates conceptual misconceptions and adds reason detail codes', () => {
  const slip = reviewCard(card('slip'), 'again', '2026-11-12T10:00:00Z', { reason: 'attention' });
  const gap = reviewCard(card('gap'), 'again', '2026-11-12T10:05:00Z', { reason: 'knowledge-gap' });
  const concept = reviewCard(card('concept'), 'again', '2026-11-12T10:10:00Z', { reason: 'misconception' });

  const defaultPlan = planStudySession([slip, gap, concept], NOW);
  assert.deepEqual(defaultPlan.planned.map((p) => p.id), ['slip', 'gap', 'concept']);

  const awarePlan = planStudySession([slip, gap, concept], NOW, { reasonAware: true });
  assert.deepEqual(awarePlan.planned.map((p) => p.id), ['concept', 'gap', 'slip']);
  assert.ok(awarePlan.planned[0].reasonCodes.includes('concept-misconception'));
  assert.ok(awarePlan.planned[1].reasonCodes.includes('knowledge-gap'));
  assert.ok(awarePlan.planned[2].reasonCodes.includes('attention-slip'));
  assert.throws(() => planStudySession([slip], NOW, { reasonAware: 'yes' }), TypeError);
});

test('getStudyRecommendations flags misconception hotspots, attention slips, and backlogs honestly', () => {
  const deck = [
    reviewCard(card('b1', 'Bio'), 'again', '2026-11-12T08:00:00Z', { reason: 'misconception' }),
    reviewCard(card('b2', 'Bio'), 'again', '2026-11-12T08:00:00Z', { reason: 'misconception' }),
    reviewCard(card('a1', 'Alg'), 'again', '2026-11-12T08:00:00Z', { reason: 'attention' }),
    reviewCard(card('a2', 'Alg'), 'again', '2026-11-12T08:00:00Z', { reason: 'attention' }),
    due('h1', 'Hist'),
    due('h2', 'Hist')
  ];
  const recs = getStudyRecommendations(deck, NOW);
  const byTopic = Object.fromEntries(recs.map((r) => [r.topic, r.signal]));
  assert.equal(byTopic.Bio, 'revisit-concepts');
  assert.equal(byTopic.Alg, 'slow-down-reading');
  assert.equal(byTopic.Hist, 'clear-backlog');
});
