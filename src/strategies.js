import { createCard, reviewCard } from './index.js';

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
    intervalsDays: Object.freeze([0, 1, 3, 7, 14, 30, 60])
  }),
  gentle: Object.freeze({
    id: 'gentle',
    label: 'Gentle',
    summary: 'Shorter spacing (1d, 2d, 4d, 7d, 14d, 30d) for dense or unfamiliar topics.',
    againMinutes: 10,
    hardHours: 4,
    intervalsDays: Object.freeze([0, 1, 2, 4, 7, 14, 30])
  }),
  intensive: Object.freeze({
    id: 'intensive',
    label: 'Intensive',
    summary: 'Compressed review cadence (12h, 1d, 2d, 4d, 7d, 14d) for short-horizon prep.',
    againMinutes: 5,
    hardHours: 2,
    intervalsDays: Object.freeze([0, 0.5, 1, 2, 4, 7, 14])
  })
});

const STRATEGY_DISCLAIMER =
  'Strategies expose transparent deterministic intervals only; none claims cognitive optimality for every learner.';

const STRATEGY_OPTION_KEYS = new Set(['reason', 'strategy']);

export const STRATEGY_IDS = Object.freeze(Object.keys(STRATEGIES));

function cloneStrategy(def) {
  return {
    id: def.id,
    label: def.label,
    summary: def.summary,
    againMinutes: def.againMinutes,
    hardHours: def.hardHours,
    intervalsDays: [...def.intervalsDays],
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

function resolveDelayMs(def, rating, nextBox) {
  switch (rating) {
    case 'again':
      return def.againMinutes * MINUTE_MS;
    case 'hard':
      return def.hardHours * HOUR_MS;
    case 'good':
    case 'easy':
      return def.intervalsDays[nextBox] * DAY_MS;
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
  if (strategyId === 'balanced') {
    return updated;
  }

  const reviewedMs = Date.parse(updated.lastReviewedAt);
  const delayMs = resolveDelayMs(def, rating, updated.box);
  return {
    ...updated,
    dueAt: new Date(reviewedMs + delayMs).toISOString()
  };
}

const STEP_KEYS = new Set(['rating', 'reason']);
const COMPARE_OPTION_KEYS = new Set(['startAt', 'strategies']);

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
