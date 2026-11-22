/**
 * Metacognitive Confidence Calibration & 14-Day Forgetting Horizon Engine.
 *
 * Implements evidence-informed learning science telemetry locally at 0 TL:
 * 1. Confidence-Weighted Retrieval (Hypercorrection Effect & Lucky-Guess detection)
 * 2. Calibration Reliability Buckets + Expected Calibration Error (ECE) & Brier score
 * 3. Multi-day DSR Forgetting Horizon with "What-if I review N urgent items today?" simulation
 *
 * Epistemic boundary: Small samples are observational and never prove durable mastery.
 */
import { computeRetrievability, createMemoryState, updateDsrMemory } from './memory.js';

export const CONFIDENCE_LEVELS = Object.freeze(['low', 'medium', 'high']);

export const CONFIDENCE_PROBABILITY = Object.freeze({
  low: 0.30,
  medium: 0.65,
  high: 0.90
});

const LEVEL_SET = new Set(CONFIDENCE_LEVELS);
const DAY_MS = 24 * 60 * 60 * 1000;

function round(value, digits = 4) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Classify a single confidence-tagged retrieval observation.
 * High-confidence errors trigger the Hypercorrection alert (strongest misconception signal);
 * low-confidence correct answers are flagged as fragile / lucky guesses.
 */
export function classifyConfidenceOutcome(confidence, correct) {
  if (!LEVEL_SET.has(confidence)) {
    throw new RangeError('confidence must be one of: low, medium, high');
  }
  if (typeof correct !== 'boolean') {
    throw new TypeError('correct must be a boolean');
  }
  if (confidence === 'high' && !correct) return 'hypercorrection-alert';
  if (confidence === 'low' && correct) return 'lucky-guess';
  if (confidence === 'high' && correct) return 'calibrated-high';
  if (confidence === 'low' && !correct) return 'acknowledged-gap';
  return correct ? 'developing-correct' : 'developing-miss';
}

/**
 * Compute metacognitive calibration buckets, Expected Calibration Error (ECE),
 * Brier score, hypercorrection alerts, and lucky-guess counts across learner records.
 */
export function analyzeMetacognitiveCalibration(records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  const buckets = {
    low: { level: 'low', expectedAccuracy: CONFIDENCE_PROBABILITY.low, count: 0, correctCount: 0, observedAccuracy: null, calibrationGap: null },
    medium: { level: 'medium', expectedAccuracy: CONFIDENCE_PROBABILITY.medium, count: 0, correctCount: 0, observedAccuracy: null, calibrationGap: null },
    high: { level: 'high', expectedAccuracy: CONFIDENCE_PROBABILITY.high, count: 0, correctCount: 0, observedAccuracy: null, calibrationGap: null }
  };

  let total = 0;
  let totalCorrect = 0;
  let sumBrier = 0;
  let hypercorrectionCount = 0;
  let luckyGuessCount = 0;
  let acknowledgedGapCount = 0;
  const hypercorrectionOutcomes = new Set();
  const luckyGuessOutcomes = new Set();

  for (const rec of records) {
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
      throw new TypeError('each calibration record must be an object');
    }
    const signal = classifyConfidenceOutcome(rec.confidence, rec.correct);
    const bucket = buckets[rec.confidence];
    bucket.count += 1;
    if (rec.correct) {
      bucket.correctCount += 1;
      totalCorrect += 1;
    }
    total += 1;

    const p = CONFIDENCE_PROBABILITY[rec.confidence];
    const y = rec.correct ? 1 : 0;
    sumBrier += (p - y) ** 2;

    if (signal === 'hypercorrection-alert') {
      hypercorrectionCount += 1;
      if (typeof rec.outcomeId === 'string' && rec.outcomeId.trim()) {
        hypercorrectionOutcomes.add(rec.outcomeId.trim());
      }
    } else if (signal === 'lucky-guess') {
      luckyGuessCount += 1;
      if (typeof rec.outcomeId === 'string' && rec.outcomeId.trim()) {
        luckyGuessOutcomes.add(rec.outcomeId.trim());
      }
    } else if (signal === 'acknowledged-gap') {
      acknowledgedGapCount += 1;
    }
  }

  let eceSum = 0;
  const bucketList = CONFIDENCE_LEVELS.map(level => {
    const b = buckets[level];
    if (b.count > 0) {
      b.observedAccuracy = round(b.correctCount / b.count, 4);
      b.calibrationGap = round(b.observedAccuracy - b.expectedAccuracy, 4);
      eceSum += (b.count / total) * Math.abs(b.observedAccuracy - b.expectedAccuracy);
    }
    return b;
  });

  let biasLabel = 'insufficient-data';
  if (total >= 3) {
    const weightedExpected = bucketList.reduce((acc, b) => acc + b.expectedAccuracy * b.count, 0) / total;
    const observed = totalCorrect / total;
    const diff = observed - weightedExpected;
    if (diff <= -0.12) biasLabel = 'overconfident';
    else if (diff >= 0.12) biasLabel = 'underconfident';
    else biasLabel = 'well-calibrated';
  }

  return {
    totalRecords: total,
    overallAccuracy: total > 0 ? round(totalCorrect / total, 4) : null,
    ece: total > 0 ? round(eceSum, 4) : null,
    brierScore: total > 0 ? round(sumBrier / total, 4) : null,
    biasLabel,
    hypercorrectionCount,
    luckyGuessCount,
    acknowledgedGapCount,
    hypercorrectionOutcomes: [...hypercorrectionOutcomes],
    luckyGuessOutcomes: [...luckyGuessOutcomes],
    buckets: bucketList,
    limitations:
      'Self-reported confidence levels map to fixed anchors (30%, 65%, 90%). Small sample counts are exploratory diagnostics, not psychometric proof.'
  };
}

/**
 * Project a 14-day (or custom horizon) DSR forgetting & review workload forecast
 * across concepts or cards, plus a "what-if I review N urgent items today?" comparison.
 */
export function forecastForgettingHorizon(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const horizonDays = options.horizonDays ?? 14;
  const retentionThreshold = options.retentionThreshold ?? 0.90;
  const criticalThreshold = options.criticalThreshold ?? 0.70;
  const simulateTodayReviews = options.simulateTodayReviews ?? 0;
  const nowMs = options.at != null ? Date.parse(new Date(options.at).toISOString()) : Date.now();

  if (!Number.isSafeInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) {
    throw new RangeError('horizonDays must be an integer between 1 and 90');
  }
  if (!Number.isFinite(retentionThreshold) || retentionThreshold <= 0.1 || retentionThreshold >= 0.999) {
    throw new RangeError('retentionThreshold must be between 0.1 and 0.999');
  }
  if (!Number.isSafeInteger(simulateTodayReviews) || simulateTodayReviews < 0) {
    throw new RangeError('simulateTodayReviews must be a non-negative integer');
  }

  const normalized = items.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError('each forecast item must be an object');
    }
    const stabilityDays = Math.max(0.25, Number(item.stabilityDays) || 1.0);
    const difficulty = Number.isFinite(Number(item.difficulty)) ? Number(item.difficulty) : 5.0;
    const baseElapsed = item.lastReviewedAt
      ? Math.max(0, (nowMs - Date.parse(item.lastReviewedAt)) / DAY_MS)
      : Math.max(0, Number(item.elapsedDays) || 0);
    const currentR = computeRetrievability(baseElapsed, stabilityDays) ?? 0;
    return {
      id: String(item.id ?? `item-${idx}`),
      label: String(item.label ?? item.id ?? `Item ${idx + 1}`),
      stabilityDays,
      difficulty,
      baseElapsed,
      currentR
    };
  });

  // Identify most urgent items for the "what-if I review N today?" simulation
  const sortedByUrgency = [...normalized].sort((a, b) => a.currentR - b.currentR || a.stabilityDays - b.stabilityDays);
  const simulatedBoostIds = new Set(sortedByUrgency.slice(0, simulateTodayReviews).map(i => i.id));
  const nowIso = new Date(nowMs).toISOString();

  const simulatedItems = normalized.map(item => {
    if (!simulatedBoostIds.has(item.id)) return item;
    const baseState = {
      ...createMemoryState(),
      stabilityDays: item.stabilityDays,
      difficulty: item.difficulty,
      lastReviewedAt: new Date(nowMs - Math.round(item.baseElapsed * DAY_MS)).toISOString(),
      reps: 2
    };
    const next = updateDsrMemory(baseState, 'good', nowIso);
    return {
      ...item,
      stabilityDays: next.state.stabilityDays,
      baseElapsed: 0
    };
  });

  const alreadyBelowBase = new Set();
  const alreadyBelowSim = new Set();
  const days = [];
  let peakAtRiskDay = 0;
  let peakAtRiskCount = 0;

  for (let d = 0; d <= horizonDays; d++) {
    let atRiskCount = 0;
    let criticalCount = 0;
    let newCrossings = 0;
    let sumR = 0;
    const atRiskIds = [];

    let simAtRiskCount = 0;
    let simNewCrossings = 0;

    for (const item of normalized) {
      const r = computeRetrievability(item.baseElapsed + d, item.stabilityDays) ?? 0;
      sumR += r;
      if (r < retentionThreshold) {
        atRiskCount += 1;
        atRiskIds.push(item.id);
        if (!alreadyBelowBase.has(item.id)) {
          alreadyBelowBase.add(item.id);
          newCrossings += 1;
        }
      }
      if (r < criticalThreshold) criticalCount += 1;
    }

    for (const simItem of simulatedItems) {
      const rSim = computeRetrievability(simItem.baseElapsed + d, simItem.stabilityDays) ?? 0;
      if (rSim < retentionThreshold) {
        simAtRiskCount += 1;
        if (!alreadyBelowSim.has(simItem.id)) {
          alreadyBelowSim.add(simItem.id);
          simNewCrossings += 1;
        }
      }
    }

    if (atRiskCount >= peakAtRiskCount) {
      peakAtRiskCount = atRiskCount;
      peakAtRiskDay = d;
    }

    days.push({
      dayOffset: d,
      dateIso: new Date(nowMs + d * DAY_MS).toISOString().slice(0, 10),
      atRiskCount,
      criticalCount,
      newCrossings,
      meanRetrievability: normalized.length ? round(sumR / normalized.length, 4) : null,
      atRiskIds,
      simulatedAtRiskCount: simAtRiskCount,
      simulatedNewCrossings: simNewCrossings
    });
  }

  const endBase = days[days.length - 1]?.atRiskCount ?? 0;
  const endSim = days[days.length - 1]?.simulatedAtRiskCount ?? 0;
  const day7Idx = Math.min(7, days.length - 1);
  const avoidedAtRiskAtDay7 = Math.max(0, (days[day7Idx]?.atRiskCount ?? 0) - (days[day7Idx]?.simulatedAtRiskCount ?? 0));
  const totalRiskDaysAvoided = days.reduce((sum, entry) => sum + Math.max(0, entry.atRiskCount - entry.simulatedAtRiskCount), 0);

  return {
    horizonDays,
    retentionThreshold,
    criticalThreshold,
    itemCount: normalized.length,
    simulateTodayReviews,
    peakAtRiskDay,
    peakAtRiskCount,
    avoidedAtRiskAtDay7,
    avoidedAtRiskAtHorizon: Math.max(0, endBase - endSim),
    totalRiskDaysAvoided,
    days
  };
}
