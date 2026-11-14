import { createCard, reviewCard, selectReviewQueue, MISTAKE_REASONS } from './index.js';
import { createMemoryState, updateDsrMemory } from './memory.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const STRATEGIES = Object.freeze({
  balanced: Object.freeze({
    id: 'balanced',
    label: 'Balanced (Default)',
    summary: 'Default FARK spacing (1d, 3d, 7d, 14d, 30d, 60d) for steady, general study.',
    againMinutes: 10,
    hardHours: 6,
    intervalsDays: Object.freeze([0, 1, 3, 7, 14, 30, 60]),
    adaptive: false
  }),
  gentle: Object.freeze({
    id: 'gentle',
    label: 'Gentle',
    summary: 'Shorter spacing (1d, 2d, 4d, 7d, 14d, 30d) for dense or unfamiliar topics.',
    againMinutes: 10,
    hardHours: 4,
    intervalsDays: Object.freeze([0, 1, 2, 4, 7, 14, 30]),
    adaptive: false
  }),
  intensive: Object.freeze({
    id: 'intensive',
    label: 'Intensive',
    summary: 'Compressed review cadence (12h, 1d, 2d, 4d, 7d, 14d) for short-horizon prep.',
    againMinutes: 5,
    hardHours: 2,
    intervalsDays: Object.freeze([0, 0.5, 1, 2, 4, 7, 14]),
    adaptive: false
  }),
  sm2: Object.freeze({
    id: 'sm2',
    label: 'SM-2 Adaptive',
    summary: 'Transparent ease-factor (1.3–2.8 EF) multiplier using observed intervals and self-reported lapse types.',
    againMinutes: 10,
    hardHours: 12,
    intervalsDays: Object.freeze([0, 1, 4, 10, 24, 58, 130]),
    adaptive: true
  }),
  dsr: Object.freeze({
    id: 'dsr',
    label: 'DSR Memory (FSRS-style)',
    summary: 'Difficulty-Stability-Retrievability power-law model with spacing bonuses and slip resistance (no ease hell).',
    againMinutes: 10,
    hardHours: 12,
    intervalsDays: Object.freeze([0, 2.5, 6, 15, 34, 72, 150]),
    adaptive: true
  })
});

const STRATEGY_DISCLAIMER =
  'Strategies expose transparent deterministic rules only; none claims cognitive optimality for every learner.';

const COHORT_DISCLAIMER =
  'Synthetic forgetting-curve simulation under explicit assumptions; compares scheduler behavior, not certified human retention.';

const COHORT_PROFILES = Object.freeze({
  steady: Object.freeze({ baseStability: 4.5, spread: 0.35, skipDayProb: 0.05 }),
  cramming: Object.freeze({ baseStability: 2.2, spread: 0.45, skipDayProb: 0.0 }),
  'missed-days': Object.freeze({ baseStability: 4.0, spread: 0.4, skipDayProb: 0.25 })
});

const STRATEGY_OPTION_KEYS = new Set(['reason', 'strategy', 'reasonAware']);
const STEP_KEYS = new Set(['rating', 'reason']);
const COMPARE_OPTION_KEYS = new Set(['startAt', 'strategies']);
const COHORT_OPTION_KEYS = new Set(['cardsCount', 'days', 'dailyLimit', 'profile', 'seed', 'strategies']);

export const STRATEGY_IDS = Object.freeze(Object.keys(STRATEGIES));

function cloneStrategy(def) {
  return {
    id: def.id,
    label: def.label,
    summary: def.summary,
    againMinutes: def.againMinutes,
    hardHours: def.hardHours,
    intervalsDays: [...def.intervalsDays],
    adaptive: def.adaptive,
    disclaimer: STRATEGY_DISCLAIMER
  };
}

/** Return metadata copies for every transparent scheduling strategy. */
export function listReviewStrategies() {
  return STRATEGY_IDS.map((id) => cloneStrategy(STRATEGIES[id]));
}

/** Look up one transparent strategy definition by id. */
export function getReviewStrategy(strategyId = 'balanced') {
  if (typeof strategyId !== 'string' || !Object.hasOwn(STRATEGIES, strategyId)) {
    throw new RangeError('unknown review strategy: ' + strategyId);
  }
  return cloneStrategy(STRATEGIES[strategyId]);
}

function computeEaseFactor(card, nextReason) {
  const counts = card.reasonCounts ?? {};
  const attentionLapses = counts.attention ?? 0;
  const conceptualLapses = Math.max(0, card.lapses - attentionLapses) +
    (nextReason && nextReason !== 'attention' ? 1 : 0);
  const adjustedAttention = attentionLapses + (nextReason === 'attention' ? 1 : 0);
  const rawEase =
    2.5 +
    Math.max(0, card.correct - 1) * 0.03 -
    adjustedAttention * 0.08 -
    conceptualLapses * 0.22;
  return Math.min(2.8, Math.max(1.3, rawEase));
}

function resolveReasonDelayMultiplier(card, rating, reason, reasonAware) {
  if (!reasonAware) return 1;
  const counts = card.reasonCounts ?? {};
  if (rating === 'again') {
    if (reason === 'misconception') return 0.5;
    if (reason === 'attention') return 1.5;
    return 1;
  }
  if (rating === 'good' || rating === 'easy') {
    const misconceptions = counts.misconception ?? 0;
    const knowledgeGaps = counts['knowledge-gap'] ?? 0;
    if (misconceptions > 0) return 0.8;
    if (knowledgeGaps >= 2) return 0.9;
  }
  return 1;
}

function resolveSm2DelayMs(card, updated, rating, reason) {
  const prevIntervalDays =
    card.reviews > 0 && card.dueAt && card.lastReviewedAt
      ? Math.max(0, (Date.parse(card.dueAt) - Date.parse(card.lastReviewedAt)) / DAY_MS)
      : 0;
  const ease = computeEaseFactor(card, reason);
  const counts = card.reasonCounts ?? {};
  const reasonFactor = (counts.misconception ?? 0) > 0 ? 0.85 : 1;

  switch (rating) {
    case 'again': {
      const minutes = reason === 'misconception' && card.lapses >= 1 ? 5 : reason === 'attention' ? 15 : 10;
      return minutes * MINUTE_MS;
    }
    case 'hard': {
      const days = Math.min(120, Math.max(0.5, prevIntervalDays * 1.15 * reasonFactor));
      return Math.round(days * HOUR_MS * 24);
    }
    case 'good': {
      let days;
      if (card.box === 0) days = 1;
      else if (card.box === 1) days = 4 * reasonFactor;
      else days = Math.min(180, Math.max(2, prevIntervalDays) * ease * reasonFactor);
      return Math.round(days * DAY_MS);
    }
    case 'easy': {
      const days =
        card.box === 0
          ? 4 * reasonFactor
          : Math.min(180, Math.max(2, prevIntervalDays) * (ease + 0.3) * reasonFactor);
      return Math.round(days * DAY_MS);
    }
  }
}

function resolveDsrDelayMs(card, rating, at, reason) {
  let mem = createMemoryState();
  if (card.reviews > 0 && card.lastReviewedAt && card.dueAt) {
    const prevSpanDays = Math.max(0.2, (Date.parse(card.dueAt) - Date.parse(card.lastReviewedAt)) / DAY_MS);
    const counts = card.reasonCounts ?? {};
    const attention = counts.attention ?? 0;
    const conceptual = Math.max(0, card.lapses - attention);
    mem = {
      stabilityDays: prevSpanDays,
      difficulty: Math.min(9.5, Math.max(2.2, 4.8 + conceptual * 0.45 + attention * 0.08 - Math.max(0, card.box - 1) * 0.25)),
      lastReviewedAt: card.lastReviewedAt,
      dueAt: card.dueAt,
      reps: card.reviews,
      lapses: card.lapses
    };
  }
  const res = updateDsrMemory(mem, rating, at, reason ? { reason } : {});
  return Math.max(5 * MINUTE_MS, Math.round(res.intervalDays * DAY_MS));
}

function resolveDelayMs(def, card, updated, rating, options) {
  if (def.id === 'dsr') {
    return resolveDsrDelayMs(card, rating, updated.lastReviewedAt, options.reason);
  }
  if (def.id === 'sm2') {
    return resolveSm2DelayMs(card, updated, rating, options.reason);
  }
  const mult = resolveReasonDelayMultiplier(card, rating, options.reason, Boolean(options.reasonAware));
  switch (rating) {
    case 'again':
      return Math.round(def.againMinutes * mult * MINUTE_MS);
    case 'hard':
      return Math.round(def.hardHours * mult * HOUR_MS);
    case 'good':
    case 'easy':
      return Math.round(def.intervalsDays[updated.box] * mult * DAY_MS);
  }
}

/**
 * Record one review using a named transparent interval strategy without mutating the card.
 * Validation, box bounds (0..6), counters, and self-reported reason handling stay identical to reviewCard.
 */
export function reviewCardWithStrategy(card, rating, at = new Date(), options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!STRATEGY_OPTION_KEYS.has(key)) {
      throw new RangeError('unknown review option: ' + key);
    }
  }
  const strategyId = options.strategy ?? 'balanced';
  if (typeof strategyId !== 'string' || !Object.hasOwn(STRATEGIES, strategyId)) {
    throw new RangeError('unknown review strategy: ' + strategyId);
  }
  const def = STRATEGIES[strategyId];
  const baseOptions = options.reason !== undefined ? { reason: options.reason } : {};
  const updated = reviewCard(card, rating, at, baseOptions);
  if (strategyId === 'balanced' && !options.reasonAware) {
    return updated;
  }

  const reviewedMs = Date.parse(updated.lastReviewedAt);
  const delayMs = resolveDelayMs(def, card, updated, rating, options);
  return {
    ...updated,
    dueAt: new Date(reviewedMs + delayMs).toISOString()
  };
}

function normalizeStep(step, index) {
  if (typeof step === 'string') {
    return { rating: step, reason: undefined };
  }
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    throw new TypeError(`step ${index} must be a rating string or step object`);
  }
  for (const key of Object.keys(step)) {
    if (!STEP_KEYS.has(key)) {
      throw new RangeError('unknown step field: ' + key);
    }
  }
  return {
    rating: step.rating,
    reason: step.reason
  };
}

/**
 * Simulate the same sequence of self-reported ratings across transparent strategies.
 * Each subsequent review runs at the card's previous due timestamp so spacing differences are directly comparable.
 */
export function compareStrategies(steps, options = {}) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new RangeError('steps must be a non-empty array of ratings');
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!COMPARE_OPTION_KEYS.has(key)) {
      throw new RangeError('unknown compare option: ' + key);
    }
  }

  const startAt = options.startAt ?? new Date();
  const strategyIds = options.strategies ?? STRATEGY_IDS;
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
    throw new RangeError('strategies must be a non-empty array');
  }

  const normalizedSteps = steps.map(normalizeStep);
  const strategies = strategyIds.map((strategyId) => {
    const def = getReviewStrategy(strategyId);
    let card = createCard({
      id: 'compare-' + strategyId,
      topic: 'Comparison',
      question: 'Sample comparison prompt',
      answer: 'Sample comparison answer'
    });
    let currentAt = startAt;
    const timeline = [];

    for (let i = 0; i < normalizedSteps.length; i += 1) {
      const step = normalizedSteps[i];
      const reviewOpts = { strategy: strategyId };
      if (step.reason !== undefined) {
        reviewOpts.reason = step.reason;
      }
      card = reviewCardWithStrategy(card, step.rating, currentAt, reviewOpts);
      const reviewedMs = Date.parse(card.lastReviewedAt);
      const dueMs = Date.parse(card.dueAt);
      timeline.push({
        step: i + 1,
        rating: step.rating,
        reviewedAt: card.lastReviewedAt,
        dueAt: card.dueAt,
        intervalDays: Math.round(((dueMs - reviewedMs) / DAY_MS) * 1000) / 1000,
        box: card.box
      });
      currentAt = card.dueAt;
    }

    const firstReviewMs = Date.parse(timeline[0].reviewedAt);
    const lastDueMs = Date.parse(card.dueAt);
    return {
      strategy: def.id,
      label: def.label,
      steps: timeline.length,
      finalBox: card.box,
      finalIntervalDays: timeline[timeline.length - 1].intervalDays,
      totalSpanDays: Math.round(((lastDueMs - firstReviewMs) / DAY_MS) * 1000) / 1000,
      timeline
    };
  });

  return {
    startedAt: new Date(strategies[0].timeline[0].reviewedAt).toISOString(),
    disclaimer: STRATEGY_DISCLAIMER,
    strategies
  };
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boundedInt(value, fallback, min, max, name) {
  const num = value ?? fallback;
  if (!Number.isSafeInteger(num) || num < min || num > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
  return num;
}

/**
 * Run a seeded synthetic cohort simulation comparing how transparent strategies
 * handle workload, missed study days, and forgetting assumptions over `days`.
 */
export function simulateCohort(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!COHORT_OPTION_KEYS.has(key)) {
      throw new RangeError('unknown simulation option: ' + key);
    }
  }

  const cardsCount = boundedInt(options.cardsCount, 30, 1, 500, 'cardsCount');
  const days = boundedInt(options.days, 30, 1, 180, 'days');
  const dailyLimit = boundedInt(options.dailyLimit, 20, 1, 500, 'dailyLimit');
  const seed = options.seed ?? 42;
  if (!Number.isSafeInteger(seed)) {
    throw new TypeError('seed must be a safe integer');
  }
  const profileId = options.profile ?? 'steady';
  if (typeof profileId !== 'string' || !Object.hasOwn(COHORT_PROFILES, profileId)) {
    throw new RangeError('profile must be steady, cramming, or missed-days');
  }
  const profile = COHORT_PROFILES[profileId];
  const strategyIds = options.strategies ?? STRATEGY_IDS;
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
    throw new RangeError('strategies must be a non-empty array');
  }

  const startMs = Date.parse('2026-01-01T09:00:00.000Z');
  const topics = ['Core', 'Applied', 'Synthesis'];

  const results = strategyIds.map((strategyId) => {
    const def = getReviewStrategy(strategyId);
    const rng = mulberry32(seed);
    let deck = Array.from({ length: cardsCount }, (_, i) =>
      createCard({
        id: `sim-${i + 1}`,
        topic: topics[i % topics.length],
        question: `Simulated card ${i + 1}?`,
        answer: `Simulated answer ${i + 1}`
      })
    );
    const stabilities = Array.from({ length: cardsCount }, () =>
      Math.max(0.8, profile.baseStability * (1 + (rng() * 2 - 1) * profile.spread))
    );

    let totalReviews = 0;
    let totalCorrect = 0;
    let peakDailyReviews = 0;
    let activeDays = 0;

    for (let day = 0; day < days; day += 1) {
      const skippedDay = rng() < profile.skipDayProb;
      if (skippedDay) continue;
      activeDays += 1;

      const dayStartMs = startMs + day * DAY_MS;
      const due = selectReviewQueue(deck, new Date(dayStartMs), dailyLimit);
      let dailyReviews = 0;

      for (let j = 0; j < due.length; j += 1) {
        const card = due[j];
        const cardIdx = deck.findIndex((c) => c.id === card.id);
        const recallProb =
          card.reviews === 0
            ? 0.65
            : Math.exp(-Math.max(0.05, (dayStartMs - Date.parse(card.lastReviewedAt)) / DAY_MS) / stabilities[cardIdx]);

        const roll = rng();
        let rating;
        let reason;
        if (roll > recallProb) {
          rating = 'again';
          reason = roll > recallProb + 0.18 ? MISTAKE_REASONS[1] : MISTAKE_REASONS[2];
          stabilities[cardIdx] = Math.max(0.7, stabilities[cardIdx] * 0.9);
        } else if (roll > recallProb * 0.72) {
          rating = 'hard';
          stabilities[cardIdx] *= 1.15;
        } else if (roll > recallProb * 0.28) {
          rating = 'good';
          stabilities[cardIdx] *= 1.65;
        } else {
          rating = 'easy';
          stabilities[cardIdx] *= 2.05;
        }

        const reviewMs = dayStartMs + j * 1000;
        deck[cardIdx] = reviewCardWithStrategy(deck[cardIdx], rating, new Date(reviewMs), {
          strategy: strategyId,
          reasonAware: true,
          ...(reason ? { reason } : {})
        });
        totalReviews += 1;
        dailyReviews += 1;
        if (rating !== 'again') totalCorrect += 1;
      }
      if (dailyReviews > peakDailyReviews) {
        peakDailyReviews = dailyReviews;
      }
    }

    const endAt = new Date(startMs + days * DAY_MS);
    const finalDueBacklog = selectReviewQueue(deck, endAt, cardsCount + 1).length;
    const maturedCards = deck.filter((c) => c.box >= 4).length;

    return {
      strategy: def.id,
      label: def.label,
      totalReviews,
      avgDailyReviews: Math.round((totalReviews / days) * 10) / 10,
      peakDailyReviews,
      activeDays,
      simulatedRecallRate: totalReviews === 0 ? null : Math.round((totalCorrect / totalReviews) * 1000) / 1000,
      finalDueBacklog,
      maturedCards
    };
  });

  return {
    days,
    cardsCount,
    dailyLimit,
    profile: profileId,
    seed,
    disclaimer: COHORT_DISCLAIMER,
    results
  };
}
