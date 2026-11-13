/**
 * Fark Study Engine — small, deterministic learning utility.
 * Zero dependencies. No database, network request, or telemetry.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60];
const RATINGS = new Set(['again', 'hard', 'good', 'easy']);
const MAX_BOX = INTERVAL_DAYS.length - 1;

function timestamp(value, field = 'timestamp') {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(field + ' must be a valid date');
  }
  return date.getTime();
}

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(field + ' must be a non-empty string');
  }
  return value.trim();
}

function checkCard(card) {
  if (!card || typeof card !== 'object' || typeof card.id !== 'string' || !card.id.trim()) {
    throw new TypeError('card must have a non-empty string id');
  }
  if (!Number.isInteger(card.box) || card.box < 0 || card.box > MAX_BOX) {
    throw new RangeError('card.box must be an integer from 0 to ' + MAX_BOX);
  }
  for (const key of ['reviews', 'correct', 'lapses']) {
    if (!Number.isSafeInteger(card[key]) || card[key] < 0) {
      throw new RangeError('card.' + key + ' must be a non-negative safe integer');
    }
  }
  if (card.correct > card.reviews || card.lapses > card.reviews) {
    throw new RangeError('card counters are inconsistent');
  }
  if (card.dueAt !== null && card.dueAt !== undefined) timestamp(card.dueAt, 'card.dueAt');
  if (card.lastReviewedAt !== null && card.lastReviewedAt !== undefined) {
    timestamp(card.lastReviewedAt, 'card.lastReviewedAt');
  }
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
    lapses: 0
  };
}

/**
 * Record one review without mutating the original card.
 * Ratings: again (10 minutes), hard (6 hours, same box),
 * good (+1 box), easy (+2 boxes). See docs/algorithm.md.
 */
export function reviewCard(card, rating, at = new Date()) {
  checkCard(card);
  if (!RATINGS.has(rating)) {
    throw new RangeError('rating must be again, hard, good, or easy');
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

  return {
    ...card,
    box,
    dueAt: new Date(reviewedMs + delayMs).toISOString(),
    lastReviewedAt: new Date(reviewedMs).toISOString(),
    reviews: card.reviews + 1,
    correct: card.correct + (rating === 'again' ? 0 : 1),
    lapses: card.lapses + (rating === 'again' ? 1 : 0)
  };
}

function isDue(card, nowMs) {
  return card.dueAt == null || timestamp(card.dueAt, 'card.dueAt') <= nowMs;
}

/** Return due/new cards, prioritizing mistakes, then older deadlines, then id. */
export function selectReviewQueue(cards, at = new Date(), limit = 20) {
  if (!Array.isArray(cards)) throw new TypeError('cards must be an array');
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('limit must be a non-negative integer');
  const nowMs = timestamp(at, 'at');
  cards.forEach(checkCard);
  return cards.filter(card => isDue(card, nowMs)).sort((a, b) => {
    if (a.lapses !== b.lapses) return b.lapses - a.lapses;
    const aDue = a.dueAt == null ? nowMs : timestamp(a.dueAt);
    const bDue = b.dueAt == null ? nowMs : timestamp(b.dueAt);
    return aDue - bDue || a.id.localeCompare(b.id);
  }).slice(0, limit);
}

/** Summarize the actual local card state; accuracy is null if no reviews exist. */
export function getStudySummary(cards, at = new Date()) {
  if (!Array.isArray(cards)) throw new TypeError('cards must be an array');
  const nowMs = timestamp(at, 'at');
  cards.forEach(checkCard);
  const totalReviews = cards.reduce((sum, card) => sum + card.reviews, 0);
  const correctReviews = cards.reduce((sum, card) => sum + card.correct, 0);
  return {
    total: cards.length,
    new: cards.filter(card => card.reviews === 0).length,
    due: cards.filter(card => isDue(card, nowMs)).length,
    studied: cards.filter(card => card.reviews > 0).length,
    mature: cards.filter(card => card.box >= 4).length,
    totalReviews,
    correctReviews,
    accuracy: totalReviews ? correctReviews / totalReviews : null
  };
}
