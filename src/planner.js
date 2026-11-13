/**
 * Explainable, bounded study-session planning.
 * Offline and deterministic for explicit timestamps. No claims of inferred mastery.
 */
import { selectReviewQueue } from './index.js';

const DEFAULT_LIMIT = 20;
const DEFAULT_TOPIC_LIMIT = 5;
const DEFAULT_NEW_LIMIT = 4;

function nonNegativeInteger(value, key) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(key + ' must be a non-negative safe integer');
  }
  return value;
}

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const allowed = new Set(['limit', 'maxPerTopic', 'maxNewCards']);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) throw new RangeError('unknown planning option: ' + key);
  }
  const limit = nonNegativeInteger(options.limit ?? DEFAULT_LIMIT, 'limit');
  const maxPerTopic = nonNegativeInteger(options.maxPerTopic ?? DEFAULT_TOPIC_LIMIT, 'maxPerTopic');
  const maxNewCards = nonNegativeInteger(options.maxNewCards ?? DEFAULT_NEW_LIMIT, 'maxNewCards');
  return { limit, maxPerTopic, maxNewCards };
}

function classify(card, nowMs) {
  const neverReviewed = card.reviews === 0;
  const reasonCodes = neverReviewed ? ['new-card'] : ['scheduled-review'];
  if (!neverReviewed && Date.parse(card.dueAt) < nowMs) {
    reasonCodes.push('overdue');
  }
  if (card.lapses > 0) {
    reasonCodes.push('previous-mistakes');
  }
  return {
    id: card.id,
    topic: card.topic,
    status: neverReviewed ? 'new' : 'review',
    dueAt: card.dueAt,
    previousMistakes: card.lapses,
    reasonCodes
  };
}

/**
 * Create a read-only, explainable selection of due cards.
 * - Respects total/session, per-topic and new-card limits.
 * - Within each topic, cards retain the existing FARK queue priority.
 * - Topics are served round-robin so one topic cannot monopolize the session.
 * - Does NOT reschedule, mutate, grade, or persist cards.
 */
export function planStudySession(cards, at = new Date(), options = {}) {
  const { limit, maxPerTopic, maxNewCards } = validateOptions(options);
  // selectReviewQueue validates card shapes, IDs and date; explicitly request all due cards.
  const eligible = selectReviewQueue(cards, at, Number.MAX_SAFE_INTEGER);
  const nowMs = new Date(at).getTime();
  const buckets = new Map();
  for (const card of eligible) {
    const bucket = buckets.get(card.topic) ?? [];
    bucket.push(card);
    buckets.set(card.topic, bucket);
  }
  // The existing priority queue is sorted globally; use the best card of each
  // topic to establish the first topic order, with a stable ASCII tie-break.
  const firstRank = new Map(eligible.map((card, index) => [card.id, index]));
  const topicNames = [...buckets.keys()].sort((a, b) => {
    const aRank = firstRank.get(buckets.get(a)[0].id);
    const bRank = firstRank.get(buckets.get(b)[0].id);
    return aRank - bRank || (a < b ? -1 : a > b ? 1 : 0);
  });
  const cursors = new Map(topicNames.map(topic => [topic, 0]));
  const counts = new Map(topicNames.map(topic => [topic, 0]));
  const planned = [];
  let newCount = 0;

  // Each round admits at most one card per topic. Loop only while progress
  // is possible; options that are all zero terminate immediately.
  while (planned.length < limit) {
    let progressed = false;
    for (const topic of topicNames) {
      if (planned.length === limit) break;
      if (counts.get(topic) >= maxPerTopic) continue;
      const bucket = buckets.get(topic);
      let index = cursors.get(topic);
      while (index < bucket.length && bucket[index].reviews === 0 && newCount >= maxNewCards) {
        index++;
      }
      cursors.set(topic, index);
      if (index >= bucket.length) continue;
      const card = bucket[index];
      cursors.set(topic, index + 1);
      planned.push(classify(card, nowMs));
      counts.set(topic, counts.get(topic) + 1);
      if (card.reviews === 0) newCount++;
      progressed = true;
    }
    if (!progressed) break;
  }

  return {
    planned,
    dueCount: eligible.length,
    plannedCount: planned.length,
    deferredCount: eligible.length - planned.length,
    newCardsPlanned: newCount,
    perTopic: Object.fromEntries([...counts].filter(([, n]) => n > 0))
  };
}
