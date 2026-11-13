import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard, getReviewForecast } from '../src/index.js';

const NOW = '2026-11-13T12:00:00.000Z';
const card = (id, topic = 'Math') => createCard({
  id, topic, question: `Question ${id}?`, answer: 'Answer'
});

test('empty deck produces zeroed forecast buckets', () => {
  const forecast = getReviewForecast([], NOW, 3);
  assert.equal(forecast.asOf, NOW);
  assert.equal(forecast.days, 3);
  assert.equal(forecast.total, 0);
  assert.equal(forecast.dueNow, 0);
  assert.equal(forecast.unreviewed, 0);
  assert.equal(forecast.later, 0);
  assert.equal(forecast.schedule.length, 3);
  assert.deepEqual(forecast.schedule.map(d => d.dueCount), [0, 0, 0]);
});

test('separates unreviewed, dueNow, scheduled days, and later cards honestly', () => {
  const unreviewedCard = card('new-1', 'History');
  const dueNowCard = reviewCard(card('due-1', 'Math'), 'again', '2026-11-13T11:00:00.000Z');
  const day1Card = reviewCard(card('d1', 'Biology'), 'good', NOW); // +1 day (box 1)
  const day3Card = reviewCard(card('d3', 'Algebra'), 'easy', NOW); // +3 days (box 2)
  let matureCard = reviewCard(card('later-1', 'Physics'), 'easy', NOW); // box 2 -> 3d
  matureCard = reviewCard(matureCard, 'easy', '2026-11-16T12:00:00.000Z'); // box 4 -> 14d

  const forecast = getReviewForecast(
    [unreviewedCard, dueNowCard, day1Card, day3Card, matureCard],
    NOW,
    7
  );

  assert.equal(forecast.total, 5);
  assert.equal(forecast.unreviewed, 1);
  assert.equal(forecast.dueNow, 1);
  assert.equal(forecast.later, 1);
  assert.equal(forecast.schedule[0].day, 1);
  assert.equal(forecast.schedule[0].dueCount, 1);
  assert.deepEqual(forecast.schedule[0].byTopic, { Biology: 1 });
  assert.equal(forecast.schedule[2].day, 3);
  assert.equal(forecast.schedule[2].dueCount, 1);
  assert.deepEqual(forecast.schedule[2].byTopic, { Algebra: 1 });
});

test('exact boundary timestamps fall into expected bucket without overlap', () => {
  const exactNow = reviewCard(card('now-card'), 'again', '2026-11-13T11:50:00.000Z'); // dueAt === NOW
  const exactDay1End = reviewCard(card('day1-card'), 'good', NOW); // dueAt === NOW + 24h
  const justAfterDay1 = reviewCard(card('day2-card'), 'good', '2026-11-13T12:00:00.001Z');

  const forecast = getReviewForecast([exactNow, exactDay1End, justAfterDay1], NOW, 2);
  assert.equal(forecast.dueNow, 1);
  assert.equal(forecast.schedule[0].dueCount, 1);
  assert.equal(forecast.schedule[1].dueCount, 1);
});

test('topic keys inside each forecast day are sorted alphabetically and cards are not mutated', () => {
  const c1 = reviewCard(card('z', 'Zoology'), 'good', NOW);
  const c2 = reviewCard(card('a', 'Art'), 'good', NOW);
  const deck = [c1, c2];
  const snapshot = structuredClone(deck);

  const forecast = getReviewForecast(deck, NOW, 1);
  assert.deepEqual(Object.keys(forecast.schedule[0].byTopic), ['Art', 'Zoology']);
  assert.deepEqual(deck, snapshot);
});

test('validates days, date, and deck invariants', () => {
  for (const badDays of [0, -2, 366, 1.5, NaN, '7']) {
    assert.throws(() => getReviewForecast([], NOW, badDays), RangeError);
  }
  assert.throws(() => getReviewForecast([], 'not-a-date', 7), TypeError);
  assert.throws(() => getReviewForecast([card('x'), card('x')], NOW, 7), /duplicate/);
});

test('500 seeded review histories preserve forecast accounting invariant', () => {
  let seed = 918273;
  const roll = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
  const ratings = ['again', 'hard', 'good', 'easy'];
  const baseMs = Date.parse(NOW);
  const deck = [];

  for (let i = 0; i < 500; i++) {
    let item = card('f-' + i, 'T-' + (i % 6));
    const steps = roll(5);
    for (let s = 0; s < steps; s++) {
      item = reviewCard(item, ratings[roll(4)], new Date(baseMs + s * 86_400_000));
    }
    deck.push(item);
  }

  const forecast = getReviewForecast(deck, new Date(baseMs + 2 * 86_400_000), 14);
  const scheduled = forecast.schedule.reduce((sum, day) => sum + day.dueCount, 0);
  assert.equal(
    forecast.dueNow + scheduled + forecast.later + forecast.unreviewed,
    forecast.total
  );
});
