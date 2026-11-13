import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard, selectReviewQueue, getStudySummary } from '../src/index.js';

const START = '2026-11-13T12:00:00.000Z';
const item = () => createCard({ id: 'math-1', topic: 'Math', question: 'What is 2 + 3?', answer: '5' });

test('createCard initializes a new, due card', () => {
  const card = item();
  assert.equal(card.box, 0);
  assert.equal(card.dueAt, null);
  assert.equal(card.reviews, 0);
  assert.equal(selectReviewQueue([card], START).length, 1);
});

test('input is validated without silent normalization of empty fields', () => {
  assert.throws(() => createCard({ id: ' ', topic: 'x', question: 'y', answer: 'z' }), /id/);
  assert.throws(() => reviewCard(item(), 'perfect', START), /rating/);
  assert.throws(() => reviewCard(item(), 'good', 'not-a-date'), /valid date/);
});

test('good schedules first review after one day, then three days', () => {
  const first = reviewCard(item(), 'good', START);
  assert.equal(first.box, 1);
  assert.equal(first.dueAt, '2026-11-14T12:00:00.000Z');
  const next = reviewCard(first, 'good', first.dueAt);
  assert.equal(next.box, 2);
  assert.equal(next.dueAt, '2026-11-17T12:00:00.000Z');
});

test('easy advances two boxes and schedules three days', () => {
  const next = reviewCard(item(), 'easy', START);
  assert.equal(next.box, 2);
  assert.equal(next.dueAt, '2026-11-16T12:00:00.000Z');
});

test('again resets box and schedules retry in ten minutes', () => {
  const initial = reviewCard(item(), 'easy', START);
  const retry = reviewCard(initial, 'again', START);
  assert.equal(retry.box, 0);
  assert.equal(retry.dueAt, '2026-11-13T12:10:00.000Z');
  assert.equal(retry.lapses, 1);
  assert.equal(retry.correct, 1);
});

test('hard keeps box and schedules six hours', () => {
  const next = reviewCard(item(), 'hard', START);
  assert.equal(next.box, 0);
  assert.equal(next.dueAt, '2026-11-13T18:00:00.000Z');
});

test('ratings cannot exceed maximum box', () => {
  let card = item();
  for (let index = 0; index < 8; index++) card = reviewCard(card, 'easy', START);
  assert.equal(card.box, 6);
  assert.equal(card.dueAt, '2027-01-12T12:00:00.000Z');
});

test('reviewCard does not mutate the original object', () => {
  const original = item();
  const updated = reviewCard(original, 'good', START);
  assert.notEqual(updated, original);
  assert.equal(original.reviews, 0);
  assert.equal(original.dueAt, null);
});

test('rejects reviews older than previous review', () => {
  const prior = reviewCard(item(), 'good', START);
  assert.throws(() => reviewCard(prior, 'good', '2026-11-12T12:00:00Z'), /before/);
});

test('selectReviewQueue skips future cards and prioritizes errors', () => {
  const first = item();
  const missed = reviewCard(createCard({ id: 'z', topic: 'Science', question: 'Q?', answer: 'A' }), 'again', START);
  const future = reviewCard(createCard({ id: 'a', topic: 'Science', question: 'Q?', answer: 'A' }), 'easy', START);
  const queue = selectReviewQueue([first, missed, future], '2026-11-13T12:11:00Z');
  assert.deepEqual(queue.map(x => x.id), ['z', 'math-1']);
  assert.equal(selectReviewQueue([first, missed], START, 1).length, 1);
});

test('summary does not fabricate accuracy before first review', () => {
  assert.deepEqual(getStudySummary([item()], START), {
    total: 1, new: 1, due: 1, studied: 0, mature: 0,
    totalReviews: 0, correctReviews: 0, accuracy: null
  });
});

test('summary measures actual historical reviews and due count', () => {
  let card = reviewCard(item(), 'good', START);
  card = reviewCard(card, 'again', START);
  const summary = getStudySummary([card], '2026-11-13T12:11:00Z');
  assert.equal(summary.totalReviews, 2);
  assert.equal(summary.correctReviews, 1);
  assert.equal(summary.accuracy, 0.5);
  assert.equal(summary.due, 1);
  assert.equal(summary.studied, 1);
});

test('invalid counter/box/date state is rejected', () => {
  assert.throws(() => getStudySummary([{ ...item(), box: 20 }], START), /box/);
  assert.throws(() => selectReviewQueue([{ ...item(), correct: 99 }], START), /inconsistent/);
  assert.throws(() => reviewCard({ ...item(), dueAt: 'broken' }, 'good', START), /valid date/);
});
