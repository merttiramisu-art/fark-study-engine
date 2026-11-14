/**
 * Transparent DSR (Difficulty, Stability, Retrievability) memory engine and
 * calibration evaluator. Zero dependencies, deterministic, and inspectable.
 *
 * Unlike SM-2's fixed ease-factor punishment, DSR models:
 * - Elapsed time since last review ("desirable difficulty" spacing bonus on delayed recalls)
 * - Mean-reverting difficulty so early mistakes do not trap a recovered card forever
 * - Distinction between attention slips and conceptual misconceptions
 * - Explicit Brier / calibration bin scoring against real observed recall outcomes
 */
import { MISTAKE_REASONS } from './index.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RATINGS = new Set(['again', 'hard', 'good', 'easy']);
const REASONS = new Set(MISTAKE_REASONS);
const OPTION_KEYS = new Set(['reason', 'targetRetention']);

export const DSR_DEFAULTS = Object.freeze({
  minDifficulty: 1.0,
  maxDifficulty: 10.0,
  defaultDifficulty: 4.8,
  minStabilityDays: 0.15,
  maxStabilityDays: 365.0,
  defaultTargetRetention: 0.9,
  powerDecayFactor: 9.0
});

function parseTimestampMs(at, field = 'at') {
  const d = at instanceof Date ? new Date(at.getTime()) : new Date(at);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(field + ' must be a valid date');
  }
  return d.getTime();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 4) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/** Create an initial empty DSR memory trace for an unreviewed item. */
export function createMemoryState() {
  return {
    stabilityDays: 0,
    difficulty: DSR_DEFAULTS.defaultDifficulty,
    lastReviewedAt: null,
    dueAt: null,
    reps: 0,
    lapses: 0
  };
}

/**
 * Compute estimated recall probability R(t) in [0, 1] using power-law forgetting:
 * R(t) = (1 + t / (9 * S))^-1, so R(S) = 0.90 when t === S.
 * Returns null if no positive stability exists yet.
 */
export function computeRetrievability(elapsedDays, stabilityDays) {
  if (typeof elapsedDays !== 'number' || Number.isNaN(elapsedDays) || elapsedDays < 0) {
    throw new RangeError('elapsedDays must be a non-negative finite number');
  }
  if (!Number.isFinite(stabilityDays) || stabilityDays < 0) {
    throw new RangeError('stabilityDays must be a non-negative finite number');
  }
  if (stabilityDays === 0) return null;
  const r = 1 / (1 + elapsedDays / (DSR_DEFAULTS.powerDecayFactor * stabilityDays));
  return round(clamp(r, 0, 1), 6);
}

/**
 * Compute next interval (in days) where retrievability crosses targetRetention.
 * At default targetRetention = 0.90, optimal interval equals stabilityDays.
 */
export function computeOptimalIntervalDays(stabilityDays, targetRetention = DSR_DEFAULTS.defaultTargetRetention) {
  if (!Number.isFinite(stabilityDays) || stabilityDays <= 0) {
    throw new RangeError('stabilityDays must be a positive finite number');
  }
  if (!Number.isFinite(targetRetention) || targetRetention <= 0.5 || targetRetention >= 0.99) {
    throw new RangeError('targetRetention must be between 0.5 and 0.99 (exclusive)');
  }
  const raw = DSR_DEFAULTS.powerDecayFactor * stabilityDays * (1 / targetRetention - 1);
  return round(clamp(raw, DSR_DEFAULTS.minStabilityDays, DSR_DEFAULTS.maxStabilityDays), 4);
}

function validateMemoryState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('memory state must be an object');
  }
  if (!Number.isFinite(state.stabilityDays) || state.stabilityDays < 0) {
    throw new RangeError('state.stabilityDays must be a non-negative finite number');
  }
  if (!Number.isFinite(state.difficulty) || state.difficulty < DSR_DEFAULTS.minDifficulty || state.difficulty > DSR_DEFAULTS.maxDifficulty) {
    throw new RangeError('state.difficulty must be between 1 and 10');
  }
  if (!Number.isSafeInteger(state.reps) || state.reps < 0) {
    throw new RangeError('state.reps must be a non-negative integer');
  }
  if (!Number.isSafeInteger(state.lapses) || state.lapses < 0) {
    throw new RangeError('state.lapses must be a non-negative integer');
  }
  if (state.lastReviewedAt != null) {
    parseTimestampMs(state.lastReviewedAt, 'state.lastReviewedAt');
  }
}

/**
 * Advance DSR memory state by one observed review without mutating input state.
 * Also reports pre-review `predictedR` and `elapsedDays` for honest calibration tracking.
 */
export function updateDsrMemory(state, rating, at = new Date(), options = {}) {
  validateMemoryState(state);
  if (!RATINGS.has(rating)) {
    throw new RangeError('rating must be again, hard, good, or easy');
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) {
      throw new RangeError('unknown memory option: ' + key);
    }
  }
  const reason = options.reason;
  if (reason != null && (!REASONS.has(reason) || rating !== 'again')) {
    throw new RangeError('reason must be a valid mistake reason on an again review');
  }
  const targetRetention = options.targetRetention ?? DSR_DEFAULTS.defaultTargetRetention;
  if (!Number.isFinite(targetRetention) || targetRetention <= 0.5 || targetRetention >= 0.99) {
    throw new RangeError('targetRetention must be between 0.5 and 0.99 (exclusive)');
  }

  const nowMs = parseTimestampMs(at, 'at');
  let elapsedDays = 0;
  if (state.lastReviewedAt != null) {
    const prevMs = parseTimestampMs(state.lastReviewedAt, 'state.lastReviewedAt');
    if (nowMs < prevMs) {
      throw new RangeError('review timestamp cannot precede previous review timestamp');
    }
    elapsedDays = round((nowMs - prevMs) / DAY_MS, 6);
  }

  const predictedR =
    state.reps > 0 && state.stabilityDays > 0
      ? computeRetrievability(elapsedDays, state.stabilityDays)
      : null;

  let nextD;
  let nextS;

  if (state.reps === 0 || state.stabilityDays === 0) {
    const baseInitD = { again: 6.5, hard: 5.5, good: 4.5, easy: 3.2 }[rating];
    const baseInitS = { again: 0.25, hard: 1.0, good: 2.5, easy: 5.0 }[rating];
    const dReasonAdjust = rating === 'again'
      ? (reason === 'misconception' ? 0.9 : reason === 'attention' ? -0.4 : 0.2)
      : 0;
    const sReasonFactor = rating === 'again' && reason === 'misconception' ? 0.6 : 1;
    nextD = clamp(baseInitD + dReasonAdjust, DSR_DEFAULTS.minDifficulty, DSR_DEFAULTS.maxDifficulty);
    nextS = clamp(baseInitS * sReasonFactor, DSR_DEFAULTS.minStabilityDays, DSR_DEFAULTS.maxStabilityDays);
  } else {
    const r = predictedR ?? 0.9;
    const dStep = { again: 0.55, hard: 0.22, good: -0.14, easy: -0.5 }[rating];
    let adjustedDStep = dStep;
    if (rating === 'again') {
      if (reason === 'attention') adjustedDStep = 0.08;
      else if (reason === 'misconception') adjustedDStep = 0.85;
    }
    const rawD = state.difficulty + adjustedDStep;
    // Mean-reversion prevents early mistakes from creating a permanent "difficulty hell".
    nextD = clamp(
      rawD + 0.08 * (DSR_DEFAULTS.defaultDifficulty - rawD),
      DSR_DEFAULTS.minDifficulty,
      DSR_DEFAULTS.maxDifficulty
    );

    if (rating === 'again') {
      const lapseRetentionFactor =
        reason === 'attention'
          ? 0.72
          : reason === 'misconception'
            ? 0.22
            : 0.35;
      nextS = clamp(
        Math.max(DSR_DEFAULTS.minStabilityDays, state.stabilityDays * lapseRetentionFactor),
        DSR_DEFAULTS.minStabilityDays,
        DSR_DEFAULTS.maxStabilityDays
      );
    } else {
      const gradeScale = { hard: 0.55, good: 1.0, easy: 1.55 }[rating];
      const difficultyFactor = (11 - nextD) / 6;
      // Low-stability cards consolidate rapidly; mature cards taper via S^-0.18 damping.
      const stabilityDamping = (state.stabilityDays + 1) ** -0.18;
      const delayFactor = 1.15 + 3.2 * (1 - r);
      const gain = 1.65 * difficultyFactor * stabilityDamping * delayFactor * gradeScale;
      nextS = clamp(
        state.stabilityDays * (1 + gain),
        DSR_DEFAULTS.minStabilityDays,
        DSR_DEFAULTS.maxStabilityDays
      );
    }
  }

  nextD = round(nextD, 4);
  nextS = round(nextS, 4);

  const scheduledIntervalDays = rating === 'again'
    ? round(reason === 'attention' ? Math.max(0.5, nextS * 0.5) : nextS * 0.25, 4)
    : computeOptimalIntervalDays(nextS, targetRetention);
  const dueAt = new Date(nowMs + Math.round(scheduledIntervalDays * DAY_MS)).toISOString();

  return {
    state: {
      stabilityDays: nextS,
      difficulty: nextD,
      lastReviewedAt: new Date(nowMs).toISOString(),
      dueAt,
      reps: state.reps + 1,
      lapses: state.lapses + (rating === 'again' ? 1 : 0)
    },
    elapsedDays,
    predictedR,
    intervalDays: scheduledIntervalDays
  };
}

/**
 * Evaluate how well predicted retrievability probabilities matched actual recall outcomes.
 * Unpredicted first-review items (`predictedR == null`) are excluded cleanly and reported separately.
 */
export function evaluatePredictionCalibration(samples) {
  if (!Array.isArray(samples)) {
    throw new TypeError('samples must be an array');
  }

  const binDefs = [
    { label: '0-20%', min: 0, max: 0.2 },
    { label: '20-40%', min: 0.2, max: 0.4 },
    { label: '40-60%', min: 0.4, max: 0.6 },
    { label: '60-80%', min: 0.6, max: 0.8 },
    { label: '80-100%', min: 0.8, max: 1.01 }
  ];
  const binAcc = binDefs.map((b) => ({ range: b.label, count: 0, sumP: 0, sumY: 0 }));

  let unscoredCount = 0;
  let scoredCount = 0;
  let sumP = 0;
  let sumY = 0;
  let sumBrier = 0;
  let sumLogLoss = 0;

  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') {
      throw new TypeError('each calibration sample must be an object');
    }
    if (sample.predictedR == null) {
      unscoredCount += 1;
      continue;
    }
    const p = sample.predictedR;
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new RangeError('sample.predictedR must be between 0 and 1');
    }
    const y = sample.recalled === true || sample.recalled === 1 ? 1 : sample.recalled === false || sample.recalled === 0 ? 0 : null;
    if (y === null) {
      throw new TypeError('sample.recalled must be boolean or 0/1');
    }

    scoredCount += 1;
    sumP += p;
    sumY += y;
    sumBrier += (p - y) ** 2;
    const clampedP = clamp(p, 1e-6, 1 - 1e-6);
    sumLogLoss += -(y * Math.log(clampedP) + (1 - y) * Math.log(1 - clampedP));

    const binIndex = Math.min(binAcc.length - 1, Math.floor(p * 5));
    binAcc[binIndex].count += 1;
    binAcc[binIndex].sumP += p;
    binAcc[binIndex].sumY += y;
  }

  return {
    sampleCount: scoredCount,
    unscoredCount,
    meanPredictedR: scoredCount ? round(sumP / scoredCount, 4) : null,
    observedRecallRate: scoredCount ? round(sumY / scoredCount, 4) : null,
    brierScore: scoredCount ? round(sumBrier / scoredCount, 4) : null,
    logLoss: scoredCount ? round(sumLogLoss / scoredCount, 4) : null,
    bins: binAcc.map((b) => ({
      range: b.range,
      count: b.count,
      meanPredictedR: b.count ? round(b.sumP / b.count, 4) : null,
      observedRecallRate: b.count ? round(b.sumY / b.count, 4) : null,
      calibrationGap: b.count ? round((b.sumY - b.sumP) / b.count, 4) : null
    }))
  };
}
