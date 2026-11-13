/**
 * FARK Study Engine — small, deterministic learning utility.
 * Zero dependencies. No database, network requests, telemetry or mastery claims.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = Object.freeze([0, 1, 3, 7, 14, 30, 60]);
const RATINGS = new Set(['again', 'hard', 'good', 'easy']);
export const MISTAKE_REASONS = Object.freeze([
  'knowledge-gap', 'misconception', 'attention', 'other'
]);
const REASONS = new Set(MISTAKE_REASONS);
const MAX_BOX = INTERVAL_DAYS.length - 1;

function timestamp(value, field = 'timestamp') {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(field + ' must be a valid date');
  return date.getTime();
}

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(field + ' must be a non-empty string');
  }
  return value.trim();
}

function safeAdd(a, b, field) {
  const sum = a + b;
  if (!Number.isSafeInteger(sum)) throw new RangeError(field + ' exceeds the safe integer range');
  return sum;
}

function reasonCounts(card) {
  const counts = card.reasonCounts ?? {};
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    throw new TypeError('card.reasonCounts must be an object');
  }
  let sum = 0;
  for (const [reason, count] of Object.entries(counts)) {
    if (!REASONS.has(reason)) throw new RangeError('unknown mistake reason: ' + reason);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError('mistake reason count must be a non-negative safe integer');
    }
    sum = safeAdd(sum, count, 'mistake reason total');
  }
  if (sum > card.lapses) throw new RangeError('mistake reasons exceed recorded lapses');
  return counts;
}

function checkCard(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    throw new TypeError('card must be an object');
  }
  for (const field of ['id', 'topic', 'question', 'answer']) requiredText(card[field], 'card.' + field);
  if (!Number.isInteger(card.box) || card.box < 0 || card.box > MAX_BOX) {
    throw new RangeError('card.box must be an integer from 0 to ' + MAX_BOX);
  }
  for (const key of ['reviews', 'correct', 'lapses']) {
    if (!Number.isSafeInteger(card[key]) || card[key] < 0) {
      throw new RangeError('card.' + key + ' must be a non-negative safe integer');
    }
  }
  if (safeAdd(card.correct, card.lapses, 'card counters') !== card.reviews) {
    throw new RangeError('card counters are inconsistent');
  }
  reasonCounts(card);
  if (card.dueAt != null) timestamp(card.dueAt, 'card.dueAt');
  if (card.lastReviewedAt != null) timestamp(card.lastReviewedAt, 'card.lastReviewedAt');
  if (card.reviews === 0 && (card.dueAt != null || card.lastReviewedAt != null)) {
    throw new RangeError('unreviewed card cannot have a review or due date');
  }
  if (card.reviews > 0 && (card.dueAt == null || card.lastReviewedAt == null)) {
    throw new RangeError('reviewed card needs its review and due dates');
  }
}

function checkCards(cards) {
  if (!Array.isArray(cards)) throw new TypeError('cards must be an array');
  const ids = new Set();
  for (const card of cards) {
    checkCard(card);
    if (ids.has(card.id)) throw new RangeError('duplicate card id: ' + card.id);
    ids.add(card.id);
  }
  return cards;
}

/** Create an independent study card. The caller owns persistence. */
export function createCard({ id, topic, question, answer }) {
  return {
    id: requiredText(id, 'id'),
    topic: requiredText(topic, 'topic'),
    question: requiredText(question, 'question'),
    answer: requiredText(answer, 'answer'),
    box: 0,
    dueAt: null,
    lastReviewedAt: null,
    reviews: 0,
    correct: 0,
    lapses: 0,
    reasonCounts: {}
  };
}

/**
 * Record one review without mutating the original card.
 * The optional options.reason is SELF-REPORTED and accepted only for 'again'.
 * Older v0.1 cards without reasonCounts remain supported.
 */
export function reviewCard(card, rating, at = new Date(), options = {}) {
  checkCard(card);
  if (!RATINGS.has(rating)) {
    throw new RangeError('rating must be again, hard, good, or easy');
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (key !== 'reason') throw new RangeError('unknown review option: ' + key);
  }
  const reason = options.reason;
  if (reason != null && (!REASONS.has(reason) || rating !== 'again')) {
    throw new RangeError('reason must be a supported mistake reason for an again review');
  }
  const reviewedMs = timestamp(at, 'at');
  if (card.lastReviewedAt != null && reviewedMs < timestamp(card.lastReviewedAt, 'card.lastReviewedAt')) {
    throw new RangeError('a review cannot happen before the previous review');
  }

  let box = card.box;
  let delayMs;
  switch (rating) {
    case 'again':
      box = 0;
      delayMs = 10 * 60 * 1000;
      break;
    case 'hard':
      delayMs = 6 * 60 * 60 * 1000;
      break;
    case 'good':
      box = Math.min(MAX_BOX, box + 1);
      delayMs = INTERVAL_DAYS[box] * DAY_MS;
      break;
    case 'easy':
      box = Math.min(MAX_BOX, box + 2);
      delayMs = INTERVAL_DAYS[box] * DAY_MS;
      break;
  }

  const dueAt = new Date(reviewedMs + delayMs).toISOString();
  const updatedCounts = { ...reasonCounts(card) };
  if (reason != null) updatedCounts[reason] = safeAdd(updatedCounts[reason] ?? 0, 1, 'mistake reason count');

  return {
    ...card,
    box,
    dueAt,
    lastReviewedAt: new Date(reviewedMs).toISOString(),
    reviews: safeAdd(card.reviews, 1, 'card.reviews'),
    correct: safeAdd(card.correct, rating === 'again' ? 0 : 1, 'card.correct'),
    lapses: safeAdd(card.lapses, rating === 'again' ? 1 : 0, 'card.lapses'),
    reasonCounts: updatedCounts
  };
}

function isDue(card, nowMs) {
  return card.dueAt == null || timestamp(card.dueAt, 'card.dueAt') <= nowMs;
}

/** Return due/new cards, prioritizing lapses, older deadlines and IDs. */
export function selectReviewQueue(cards, at = new Date(), limit = 20) {
  checkCards(cards);
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('limit must be a non-negative integer');
  const nowMs = timestamp(at, 'at');
  return cards.filter(card => isDue(card, nowMs)).sort((a, b) => {
    if (a.lapses !== b.lapses) return b.lapses - a.lapses;
    const aDue = a.dueAt == null ? nowMs : timestamp(a.dueAt);
    const bDue = b.dueAt == null ? nowMs : timestamp(b.dueAt);
    return aDue - bDue || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }).slice(0, limit);
}

function summarize(cards, nowMs) {
  let reviews = 0;
  let correct = 0;
  for (const card of cards) {
    reviews = safeAdd(reviews, card.reviews, 'totalReviews');
    correct = safeAdd(correct, card.correct, 'correctReviews');
  }
  return {
    total: cards.length,
    new: cards.filter(card => card.reviews === 0).length,
    due: cards.filter(card => isDue(card, nowMs)).length,
    studied: cards.filter(card => card.reviews > 0).length,
    mature: cards.filter(card => card.box >= 4).length,
    totalReviews: reviews,
    correctReviews: correct,
    accuracy: reviews ? correct / reviews : null
  };
}

/** Summarize local self-reported reviews; null accuracy when unobserved. */
export function getStudySummary(cards, at = new Date()) {
  checkCards(cards);
  return summarize(cards, timestamp(at, 'at'));
}

/** Group summary by topic. Topic names are descriptive, not inferred mastery. */
export function getTopicSummaries(cards, at = new Date()) {
  checkCards(cards);
  const nowMs = timestamp(at, 'at');
  const groups = new Map();
  for (const card of cards) {
    const group = groups.get(card.topic) ?? [];
    group.push(card);
    groups.set(card.topic, group);
  }
  return [...groups.keys()]
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
    .map(topic => ({ topic, ...summarize(groups.get(topic), nowMs) }));
}

/** Count SELF-REPORTED mistake reasons without inventing reasons for old reviews. */
export function getMistakeBreakdown(cards) {
  checkCards(cards);
  const byReason = Object.fromEntries(MISTAKE_REASONS.map(reason => [reason, 0]));
  let totalLapses = 0;
  let classified = 0;
  for (const card of cards) {
    totalLapses = safeAdd(totalLapses, card.lapses, 'totalLapses');
    for (const [reason, count] of Object.entries(reasonCounts(card))) {
      byReason[reason] = safeAdd(byReason[reason], count, 'reason total');
      classified = safeAdd(classified, count, 'classified');
    }
  }
  return { totalLapses, classified, unspecified: totalLapses - classified, byReason };
}

/** Validate a complete deck without requiring a clock or computing statistics. */
export function validateDeck(cards) {
  checkCards(cards);
  return true;
}

/**
 * Project already-scheduled review workload across the next `days` 24-hour windows.
 * Unreviewed cards remain separate as `unreviewed`; nothing invents future answers.
 */
export function getReviewForecast(cards, at = new Date(), days = 7) {
  checkCards(cards);
  const nowMs = timestamp(at, 'at');
  if (!Number.isSafeInteger(days) || days < 1 || days > 365) {
    throw new RangeError('days must be an integer from 1 to 365');
  }

  const buckets = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    from: new Date(nowMs + index * DAY_MS).toISOString(),
    to: new Date(nowMs + (index + 1) * DAY_MS).toISOString(),
    dueCount: 0,
    topicCounts: new Map()
  }));

  let dueNow = 0;
  let unreviewed = 0;
  let later = 0;
  const horizonMs = nowMs + days * DAY_MS;

  for (const card of cards) {
    if (card.reviews === 0) {
      unreviewed++;
      continue;
    }
    const dueMs = timestamp(card.dueAt, 'card.dueAt');
    if (dueMs <= nowMs) {
      dueNow++;
      continue;
    }
    if (dueMs > horizonMs) {
      later++;
      continue;
    }
    const bucketIndex = Math.floor((dueMs - nowMs - 1) / DAY_MS);
    const bucket = buckets[bucketIndex];
    bucket.dueCount++;
    bucket.topicCounts.set(card.topic, (bucket.topicCounts.get(card.topic) ?? 0) + 1);
  }

  return {
    asOf: new Date(nowMs).toISOString(),
    days,
    total: cards.length,
    dueNow,
    unreviewed,
    later,
    schedule: buckets.map(({ day, from, to, dueCount, topicCounts }) => ({
      day,
      from,
      to,
      dueCount,
      byTopic: Object.fromEntries(
        [...topicCounts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      )
    }))
  };
}
