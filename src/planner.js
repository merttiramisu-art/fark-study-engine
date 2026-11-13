/**
 * Explainable, bounded study-session planning and honest topic recommendations.
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
  const allowed = new Set(['limit', 'maxPerTopic', 'maxNewCards', 'reasonAware']);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) throw new RangeError('unknown planning option: ' + key);
  }
  if (options.reasonAware !== undefined && typeof options.reasonAware !== 'boolean') {
    throw new TypeError('reasonAware must be a boolean');
  }
  const limit = nonNegativeInteger(options.limit ?? DEFAULT_LIMIT, 'limit');
  const maxPerTopic = nonNegativeInteger(options.maxPerTopic ?? DEFAULT_TOPIC_LIMIT, 'maxPerTopic');
  const maxNewCards = nonNegativeInteger(options.maxNewCards ?? DEFAULT_NEW_LIMIT, 'maxNewCards');
  return { limit, maxPerTopic, maxNewCards, reasonAware: Boolean(options.reasonAware) };
}

function reasonSeverityScore(card) {
  const counts = card.reasonCounts ?? {};
  return (counts.misconception ?? 0) * 3 + (counts['knowledge-gap'] ?? 0) * 2 + (counts.other ?? 0);
}

function classify(card, nowMs, reasonAware) {
  const neverReviewed = card.reviews === 0;
  const reasonCodes = neverReviewed ? ['new-card'] : ['scheduled-review'];
  if (!neverReviewed && Date.parse(card.dueAt) < nowMs) {
    reasonCodes.push('overdue');
  }
  if (card.lapses > 0) {
    reasonCodes.push('previous-mistakes');
  }
  if (reasonAware && card.lapses > 0) {
    const counts = card.reasonCounts ?? {};
    if ((counts.misconception ?? 0) > 0) reasonCodes.push('concept-misconception');
    if ((counts['knowledge-gap'] ?? 0) > 0) reasonCodes.push('knowledge-gap');
    if ((counts.attention ?? 0) > 0 && (counts.misconception ?? 0) === 0 && (counts['knowledge-gap'] ?? 0) === 0) {
      reasonCodes.push('attention-slip');
    }
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
 * - Topics are served round-robin so one topic cannot monopolize the session.
 * - Optional `reasonAware: true` elevates conceptual/knowledge-gap lapses ahead of minor slips.
 * - Does NOT reschedule, mutate, grade, or persist cards.
 */
export function planStudySession(cards, at = new Date(), options = {}) {
  const { limit, maxPerTopic, maxNewCards, reasonAware } = validateOptions(options);
  const eligible = selectReviewQueue(cards, at, Number.MAX_SAFE_INTEGER);
  const nowMs = new Date(at).getTime();

  const indexMap = new Map(eligible.map((card, index) => [card.id, index]));
  const orderedEligible = reasonAware
    ? [...eligible].sort((a, b) => {
        const diff = reasonSeverityScore(b) - reasonSeverityScore(a);
        return diff !== 0 ? diff : indexMap.get(a.id) - indexMap.get(b.id);
      })
    : eligible;

  const buckets = new Map();
  for (const card of orderedEligible) {
    const bucket = buckets.get(card.topic) ?? [];
    bucket.push(card);
    buckets.set(card.topic, bucket);
  }
  const firstRank = new Map(orderedEligible.map((card, index) => [card.id, index]));
  const topicNames = [...buckets.keys()].sort((a, b) => {
    const aRank = firstRank.get(buckets.get(a)[0].id);
    const bRank = firstRank.get(buckets.get(b)[0].id);
    return aRank - bRank || (a < b ? -1 : a > b ? 1 : 0);
  });
  const cursors = new Map(topicNames.map(topic => [topic, 0]));
  const counts = new Map(topicNames.map(topic => [topic, 0]));
  const planned = [];
  let newCount = 0;

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
      planned.push(classify(card, nowMs, reasonAware));
      counts.set(topic, counts.get(topic) + 1);
      if (card.reviews === 0) newCount++;
      progressed = true;
    }
    if (!progressed) break;
  }

  return {
    planned,
    dueCount: orderedEligible.length,
    plannedCount: planned.length,
    deferredCount: orderedEligible.length - planned.length,
    newCardsPlanned: newCount,
    perTopic: Object.fromEntries([...counts].filter(([, n]) => n > 0))
  };
}

/**
 * Inspect self-reported lapse patterns and due ratios per topic to suggest honest study focus.
 * Produces descriptive heuristics only—never inferred grades or mastery claims.
 */
export function getStudyRecommendations(cards, at = new Date()) {
  const dueCards = selectReviewQueue(cards, at, Number.MAX_SAFE_INTEGER);
  const dueSet = new Set(dueCards.map(c => c.id));
  const groups = new Map();

  for (const card of cards) {
    const entry = groups.get(card.topic) ?? {
      total: 0, due: 0, misconceptions: 0, gaps: 0, attention: 0, totalLapses: 0
    };
    entry.total += 1;
    if (dueSet.has(card.id)) entry.due += 1;
    const rc = card.reasonCounts ?? {};
    entry.misconceptions += rc.misconception ?? 0;
    entry.gaps += rc['knowledge-gap'] ?? 0;
    entry.attention += rc.attention ?? 0;
    entry.totalLapses += card.lapses;
    groups.set(card.topic, entry);
  }

  const recommendations = [];
  for (const [topic, stats] of [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (stats.misconceptions >= 2 || (stats.misconceptions >= 1 && stats.misconceptions >= stats.attention)) {
      recommendations.push({
        topic,
        signal: 'revisit-concepts',
        due: stats.due,
        total: stats.total,
        message: 'Self-reported concept mix-ups appear often here; consider rereading core explanations before drilling more cards.'
      });
    } else if (stats.gaps >= 2) {
      recommendations.push({
        topic,
        signal: 'fill-missing-facts',
        due: stats.due,
        total: stats.total,
        message: 'Multiple self-reported knowledge gaps remain; review foundational prompts first.'
      });
    } else if (stats.attention >= 2 && stats.misconceptions === 0) {
      recommendations.push({
        topic,
        signal: 'slow-down-reading',
        due: stats.due,
        total: stats.total,
        message: 'Recent lapses were mostly marked as attention slips; slowing down on recall may help without shortening intervals.'
      });
    } else if (stats.due > 0 && stats.due / stats.total >= 0.6) {
      recommendations.push({
        topic,
        signal: 'clear-backlog',
        due: stats.due,
        total: stats.total,
        message: `${stats.due} of ${stats.total} cards are currently due; cap new cards briefly to clear queued reviews.`
      });
    }
  }
  return recommendations;
}
