/**
 * Concept Prerequisite Diagnosis, Recent-Weighted Cognitive Dynamics,
 * and Closed-Loop Intervention Evaluation.
 *
 * Moves FARK beyond fire-and-forget recommendations:
 * 1. Traces recent recall trends (recovery after old mistakes is visible, not buried).
 * 2. Detects prerequisite gaps across the acyclic concept graph.
 * 3. Attaches explicit numeric evidence & confidence to every recommendation.
 * 4. Seals AI/educator interventions into the ledger with a frozen baseline and
 *    evaluates post-intervention recall, misconception drop, stability gain,
 *    and net uplift relative to untouched topics.
 */
import { computeRetrievability, evaluatePredictionCalibration } from './memory.js';
import { getCardMemoryState, projectCardsFromLedger, validateLedger } from './ledger.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseAtMs(at) {
  const date = at instanceof Date ? new Date(at.getTime()) : new Date(at);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('at must be a valid date');
  }
  return date.getTime();
}

function round(v, digits = 4) {
  if (v == null || !Number.isFinite(v)) return null;
  const s = 10 ** digits;
  return Math.round(v * s) / s;
}

function summarizeWindow(events) {
  if (events.length === 0) {
    return {
      count: 0,
      recallRate: null,
      misconceptionCount: 0,
      misconceptionRate: null,
      attentionCount: 0,
      knowledgeGapCount: 0
    };
  }
  let recalled = 0;
  let misconceptionCount = 0;
  let attentionCount = 0;
  let knowledgeGapCount = 0;
  for (const ev of events) {
    if (ev.rating !== 'again') recalled += 1;
    if (ev.reason === 'misconception') misconceptionCount += 1;
    else if (ev.reason === 'attention') attentionCount += 1;
    else if (ev.reason === 'knowledge-gap') knowledgeGapCount += 1;
  }
  return {
    count: events.length,
    recallRate: round(recalled / events.length),
    misconceptionCount,
    misconceptionRate: round(misconceptionCount / events.length),
    attentionCount,
    knowledgeGapCount
  };
}

/**
 * Summarize per-concept dynamics at timestamp `at`, separating recent vs earlier events
 * and aggregating current DSR retrievability and stability across member cards.
 */
export function computeConceptDynamics(ledger, at = new Date()) {
  validateLedger(ledger);
  const nowMs = parseAtMs(at);
  const projected = projectCardsFromLedger(ledger, at);
  const projectedById = new Map(projected.map((c) => [c.id, c]));

  const conceptCards = new Map();
  for (const id of Object.keys(ledger.concepts)) {
    conceptCards.set(id, []);
  }
  for (const card of Object.values(ledger.cards)) {
    for (const cid of card.concepts) {
      if (!conceptCards.has(cid)) conceptCards.set(cid, []);
      conceptCards.get(cid).push(card.id);
    }
  }

  const reviewEvents = ledger.events.filter((e) => e.type === 'review');
  const results = {};

  for (const [conceptId, cardIds] of [...conceptCards.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const node = ledger.concepts[conceptId] ?? { id: conceptId, label: conceptId, prerequisites: [] };
    const events = reviewEvents.filter((e) => e.concepts.includes(conceptId));
    const overall = summarizeWindow(events);
    const recentSlice = events.slice(-6);
    const priorSlice = events.slice(0, Math.max(0, events.length - recentSlice.length));
    const recent = summarizeWindow(recentSlice);
    const prior = summarizeWindow(priorSlice);

    let trend = 'insufficient-history';
    let trendDelta = null;
    if (recent.recallRate != null && prior.recallRate != null) {
      trendDelta = round(recent.recallRate - prior.recallRate);
      if (trendDelta >= 0.15) trend = 'improving';
      else if (trendDelta <= -0.15) trend = 'declining';
      else trend = 'steady';
    }

    let dueCount = 0;
    let totalR = 0;
    let rCount = 0;
    let totalS = 0;
    let totalD = 0;
    let memCount = 0;
    const lowRecallCardIds = [];

    for (const cardId of cardIds) {
      const cardProj = projectedById.get(cardId);
      if (cardProj && (cardProj.dueAt == null || Date.parse(cardProj.dueAt) <= nowMs)) {
        dueCount += 1;
      }
      const mem = getCardMemoryState(ledger, cardId);
      if (mem.reps > 0 && mem.lastReviewedAt) {
        const elapsedDays = Math.max(0, (nowMs - Date.parse(mem.lastReviewedAt)) / DAY_MS);
        const r = computeRetrievability(elapsedDays, mem.stabilityDays);
        if (r != null) {
          totalR += r;
          rCount += 1;
          if (r < 0.75) lowRecallCardIds.push(cardId);
        }
        totalS += mem.stabilityDays;
        totalD += mem.difficulty;
        memCount += 1;
      }
    }

    // Fallback when cards came from an imported snapshot without raw ledger events.
    let snapshotReviews = 0;
    let snapshotCorrect = 0;
    let snapshotMisconceptions = 0;
    for (const cardId of cardIds) {
      const snap = ledger.cards[cardId].importedSnapshot;
      if (snap && snap.reviews > 0) {
        snapshotReviews += snap.reviews;
        snapshotCorrect += snap.correct;
        snapshotMisconceptions += snap.reasonCounts?.misconception ?? 0;
      }
    }

    const combinedReviews = overall.count > 0 ? overall.count : snapshotReviews;
    const effectiveRecallRate =
      recent.recallRate != null
        ? recent.recallRate
        : snapshotReviews > 0
          ? round(snapshotCorrect / snapshotReviews)
          : null;

    results[conceptId] = {
      conceptId,
      label: node.label,
      prerequisites: [...node.prerequisites],
      cardCount: cardIds.length,
      dueCount,
      totalEvents: overall.count,
      combinedReviews,
      overallRecallRate:
        overall.recallRate != null
          ? overall.recallRate
          : snapshotReviews > 0
            ? round(snapshotCorrect / snapshotReviews)
            : null,
      recentRecallRate: effectiveRecallRate,
      recentMisconceptionCount: overall.count > 0 ? recent.misconceptionCount : snapshotMisconceptions,
      recentMisconceptionRate:
        overall.count > 0
          ? recent.misconceptionRate
          : snapshotReviews > 0
            ? round(snapshotMisconceptions / snapshotReviews)
            : null,
      recentAttentionCount: recent.attentionCount,
      trend,
      trendDelta,
      meanRetrievability: rCount > 0 ? round(totalR / rCount) : null,
      meanStabilityDays: memCount > 0 ? round(totalS / memCount, 2) : null,
      meanDifficulty: memCount > 0 ? round(totalD / memCount, 2) : null,
      lowRecallCardIds
    };
  }

  return results;
}

function confidenceFromSample(n) {
  if (n >= 5) return 'high';
  if (n >= 2) return 'medium';
  return 'low';
}

/**
 * Produce ranked, evidence-backed learning diagnoses across prerequisite graphs,
 * recent misconception/attention patterns, fading DSR memory traces, and Brier calibration.
 */
export function diagnoseLearner(ledger, at = new Date()) {
  validateLedger(ledger);
  parseAtMs(at);
  const dynamics = computeConceptDynamics(ledger, at);

  const reviewSamples = ledger.events
    .filter((e) => e.type === 'review')
    .map((e) => ({ predictedR: e.predictedR ?? null, recalled: e.rating !== 'again' }));
  const calibration = evaluatePredictionCalibration(reviewSamples);

  const recommendations = [];
  for (const item of Object.values(dynamics)) {
    const sampleSize = item.combinedReviews;
    const isStruggling =
      (item.recentRecallRate != null && item.recentRecallRate < 0.72) ||
      item.recentMisconceptionCount >= 1;

    // 1. Check prerequisite bottlenecks before prescribing repetitive drilling on child concepts.
    let flaggedPrereq = false;
    if (isStruggling && item.prerequisites.length > 0 && item.trend !== 'improving') {
      for (const reqId of item.prerequisites) {
        const req = dynamics[reqId];
        if (!req) continue;
        const reqWeak =
          req.combinedReviews === 0 ||
          (req.recentRecallRate != null && req.recentRecallRate < 0.78) ||
          (req.meanRetrievability != null && req.meanRetrievability < 0.78) ||
          req.recentMisconceptionCount >= 1;
        if (reqWeak) {
          flaggedPrereq = true;
          recommendations.push({
            signal: 'fix-prerequisite',
            priority: 100,
            confidence: confidenceFromSample(sampleSize + req.combinedReviews),
            targetTopic: item.conceptId,
            targetConcepts: [item.conceptId, reqId],
            prerequisiteConcept: reqId,
            headline: `Repair prerequisite "${req.label}" before drilling more "${item.label}".`,
            recommendedAction: `Pause new "${item.label}" cards and review foundational "${req.label}" prompts first.`,
            hypothesis: `Raising recall/stability on "${req.label}" will reduce conceptual errors when returning to "${item.label}".`,
            evidence: {
              targetRecallRate: item.recentRecallRate,
              targetMisconceptions: item.recentMisconceptionCount,
              prerequisiteRecallRate: req.recentRecallRate,
              prerequisiteRetrievability: req.meanRetrievability,
              prerequisiteReviews: req.combinedReviews
            }
          });
          break;
        }
      }
    }

    // 2. Direct conceptual misconceptions (when prerequisites look healthy or absent).
    if (!flaggedPrereq && item.recentMisconceptionCount >= 1 && item.trend !== 'improving' && (item.recentMisconceptionCount >= 2 || (item.recentMisconceptionRate ?? 0) >= 0.35)) {
      recommendations.push({
        signal: 'resolve-misconception',
        priority: 85,
        confidence: confidenceFromSample(sampleSize),
        targetTopic: item.conceptId,
        targetConcepts: [item.conceptId],
        headline: `Conceptual mix-ups clustered in "${item.label}".`,
        recommendedAction: `Re-read underlying explanations or rewrite "${item.label}" prompts into smaller atomic comparisons.`,
        hypothesis: `Clarifying conceptual distinctions will reduce repeat misconception lapses and grow stability.`,
        evidence: {
          recentRecallRate: item.recentRecallRate,
          recentMisconceptions: item.recentMisconceptionCount,
          meanDifficulty: item.meanDifficulty,
          trend: item.trend
        }
      });
    } else if (item.lowRecallCardIds.length >= 2) {
      // 3. DSR retrievability alert (cards dropping below 75% predicted recall).
      recommendations.push({
        signal: 'rescue-fading-memory',
        priority: 70,
        confidence: confidenceFromSample(item.lowRecallCardIds.length),
        targetTopic: item.conceptId,
        targetConcepts: [item.conceptId],
        headline: `${item.lowRecallCardIds.length} "${item.label}" cards dropped below 75% estimated recall.`,
        recommendedAction: `Prioritize these fading items before they completely decay and force a stability reset.`,
        hypothesis: `Delayed-but-successful recall near the 65–75% window boosts DSR stability significantly.`,
        evidence: {
          fadingCards: item.lowRecallCardIds,
          meanRetrievability: item.meanRetrievability,
          meanStabilityDays: item.meanStabilityDays
        }
      });
    } else if (item.recentAttentionCount >= 2 && item.recentMisconceptionCount === 0) {
      // 4. Attention slips rather than conceptual decay.
      recommendations.push({
        signal: 'slow-down-reading',
        priority: 55,
        confidence: confidenceFromSample(sampleSize),
        targetTopic: item.conceptId,
        targetConcepts: [item.conceptId],
        headline: `Errors in "${item.label}" are mainly attention slips, not concept gaps.`,
        recommendedAction: `Keep normal intervals instead of shortening cadence; slow down prompt reading and verify answers before flipping.`,
        hypothesis: `Prompt attention focus will recover recall accuracy without extra review burden.`,
        evidence: {
          attentionSlips: item.recentAttentionCount,
          misconceptions: item.recentMisconceptionCount,
          meanStabilityDays: item.meanStabilityDays
        }
      });
    } else if (item.cardCount > 0 && item.dueCount > 0 && item.dueCount / item.cardCount >= 0.6) {
      recommendations.push({
        signal: 'consolidate-backlog',
        priority: 40,
        confidence: confidenceFromSample(item.cardCount),
        targetTopic: item.conceptId,
        targetConcepts: [item.conceptId],
        headline: `Backlog building in "${item.label}" (${item.dueCount}/${item.cardCount} due).`,
        recommendedAction: `Temporarily lower maxNewCards to 0–1 until due ratio falls below 40%.`,
        hypothesis: `Capping new intake stabilizes daily queue pressure and prevents cascading lapses.`,
        evidence: {
          dueCount: item.dueCount,
          cardCount: item.cardCount,
          dueRatio: round(item.dueCount / item.cardCount, 2)
        }
      });
    }
  }

  recommendations.sort((a, b) => b.priority - a.priority || a.targetTopic.localeCompare(b.targetTopic));

  return {
    evaluatedAt: new Date(parseAtMs(at)).toISOString(),
    concepts: dynamics,
    recommendations,
    calibration
  };
}

/**
 * Seal a recommended or custom educational intervention into the append-only ledger
 * with a frozen pre-intervention baseline and matched control-topic baseline.
 */
export function recordIntervention(ledger, proposal, at = new Date()) {
  validateLedger(ledger);
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw new TypeError('proposal must be an object');
  }
  const atIso = new Date(parseAtMs(at)).toISOString();
  const targetTopic = String(proposal.targetTopic ?? '').trim();
  if (!targetTopic) throw new RangeError('proposal.targetTopic must be a non-empty string');

  const targetConcepts = Array.isArray(proposal.targetConcepts) && proposal.targetConcepts.length
    ? proposal.targetConcepts.map((c) => String(c).trim()).filter(Boolean)
    : [targetTopic];
  const targetSet = new Set(targetConcepts);

  const priorReviews = ledger.events.filter((e) => e.type === 'review' && Date.parse(e.at) <= Date.parse(atIso));
  const targetEvents = priorReviews.filter((e) => e.topic === targetTopic || e.concepts.some((c) => targetSet.has(c)));
  const controlEvents = priorReviews.filter((e) => e.topic !== targetTopic && !e.concepts.some((c) => targetSet.has(c)));

  const targetSummary = summarizeWindow(targetEvents);
  const controlSummary = summarizeWindow(controlEvents);

  const dynamics = computeConceptDynamics(ledger, atIso);
  const meanStabilityDays = dynamics[targetTopic]?.meanStabilityDays ?? 0;

  const intervention = {
    id: proposal.id ?? `intv-${ledger.events.length + 1}`,
    type: 'intervention',
    at: atIso,
    targetTopic,
    targetConcepts,
    signal: String(proposal.signal ?? 'custom-intervention'),
    action: String(proposal.recommendedAction ?? proposal.action ?? 'Targeted study adjustment'),
    hypothesis: String(proposal.hypothesis ?? 'Expected to improve post-intervention recall and stability.'),
    baseline: {
      targetReviews: targetSummary.count,
      targetRecallRate: targetSummary.recallRate,
      targetMisconceptionRate: targetSummary.misconceptionRate,
      meanStabilityDays,
      controlReviews: controlSummary.count,
      controlRecallRate: controlSummary.recallRate
    }
  };

  const next = structuredClone(ledger);
  next.events.push(intervention);
  return { ledger: next, intervention };
}

/**
 * Evaluate whether a recorded intervention actually coincided with improvement
 * by comparing pre-intervention baseline vs post-intervention reviews (and non-target topics).
 */
export function evaluateIntervention(ledger, interventionId, at = new Date(), options = {}) {
  validateLedger(ledger);
  const nowIso = new Date(parseAtMs(at)).toISOString();
  const minFollowUpReviews = options.minFollowUpReviews ?? 3;
  if (!Number.isSafeInteger(minFollowUpReviews) || minFollowUpReviews < 1) {
    throw new RangeError('minFollowUpReviews must be a positive integer');
  }

  const intervention = ledger.events.find((e) => e.type === 'intervention' && e.id === interventionId);
  if (!intervention) {
    throw new RangeError('unknown intervention id: ' + interventionId);
  }

  const startMs = Date.parse(intervention.at);
  const endMs = Date.parse(nowIso);
  const targetSet = new Set(intervention.targetConcepts);

  const postReviews = ledger.events.filter(
    (e) => e.type === 'review' && Date.parse(e.at) > startMs && Date.parse(e.at) <= endMs
  );
  const postTarget = postReviews.filter(
    (e) => e.topic === intervention.targetTopic || e.concepts.some((c) => targetSet.has(c))
  );
  const postControl = postReviews.filter(
    (e) => e.topic !== intervention.targetTopic && !e.concepts.some((c) => targetSet.has(c))
  );

  const targetPost = summarizeWindow(postTarget);
  const controlPost = summarizeWindow(postControl);
  const base = intervention.baseline;

  const recallDelta =
    targetPost.recallRate != null && base.targetRecallRate != null
      ? round(targetPost.recallRate - base.targetRecallRate)
      : null;
  const misconceptionDelta =
    targetPost.misconceptionRate != null && base.targetMisconceptionRate != null
      ? round(targetPost.misconceptionRate - base.targetMisconceptionRate)
      : null;
  const controlRecallDelta =
    controlPost.recallRate != null && base.controlRecallRate != null
      ? round(controlPost.recallRate - base.controlRecallRate)
      : null;
  const netUpliftVsControl =
    recallDelta != null && controlRecallDelta != null
      ? round(recallDelta - controlRecallDelta)
      : null;

  const dynamics = computeConceptDynamics(ledger, nowIso);
  const meanStabilityAfter = dynamics[intervention.targetTopic]?.meanStabilityDays ?? base.meanStabilityDays;
  const stabilityDeltaDays = round(meanStabilityAfter - base.meanStabilityDays, 2);

  let verdict;
  if (targetPost.count < minFollowUpReviews) {
    verdict = 'insufficient-data';
  } else if (
    (recallDelta != null && recallDelta >= 0.12) ||
    (misconceptionDelta != null && misconceptionDelta <= -0.15 && (recallDelta == null || recallDelta >= 0)) ||
    stabilityDeltaDays >= 1.5
  ) {
    verdict = 'positive-signal';
  } else if (
    (recallDelta != null && recallDelta <= -0.12) ||
    (misconceptionDelta != null && misconceptionDelta >= 0.15)
  ) {
    verdict = 'no-improvement-reassess';
  } else {
    verdict = 'mixed-or-neutral';
  }

  return {
    interventionId: intervention.id,
    targetTopic: intervention.targetTopic,
    signal: intervention.signal,
    action: intervention.action,
    hypothesis: intervention.hypothesis,
    recordedAt: intervention.at,
    evaluatedAt: nowIso,
    followUpTargetReviews: targetPost.count,
    followUpControlReviews: controlPost.count,
    baseline: base,
    postIntervention: {
      targetRecallRate: targetPost.recallRate,
      targetMisconceptionRate: targetPost.misconceptionRate,
      meanStabilityDays: meanStabilityAfter,
      controlRecallRate: controlPost.recallRate
    },
    deltas: {
      recallDelta,
      misconceptionDelta,
      stabilityDeltaDays,
      controlRecallDelta,
      netUpliftVsControl
    },
    verdict,
    limitations:
      'Observational pre/post within-learner comparison against non-target topics; sample size is small and not a randomized clinical trial.'
  };
}

/** Evaluate every intervention recorded in the ledger at timestamp `at`. */
export function evaluateAllInterventions(ledger, at = new Date(), options = {}) {
  validateLedger(ledger);
  return ledger.events
    .filter((e) => e.type === 'intervention')
    .map((e) => evaluateIntervention(ledger, e.id, at, options));
}
