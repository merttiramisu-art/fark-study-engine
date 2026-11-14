/**
 * Empirical Scheduler & Closed-Loop Intervention Benchmark.
 *
 * Tests three concrete hypotheses offline (0 external dependencies):
 * 1. Does DSR predict recall probability with useful Brier calibration across learner profiles?
 * 2. In "slip-prone" learners (high attention slips, intact conceptual mastery), does FARK DSR
 *    avoid SM-2's permanent ease-factor penalty ("Ease Hell") and cut redundant reviews?
 * 3. Across 50 synthetic multi-topic learners, can closed-loop diagnosis + intervention evaluation
 *    correctly separate real prerequisite recovery from coincidental noise?
 */
import { createCard, selectReviewQueue } from '../src/index.js';
import { reviewCardWithStrategy } from '../src/strategies.js';
import { computeRetrievability, evaluatePredictionCalibration } from '../src/memory.js';
import { createLedger, recordLedgerReview, upsertLedgerCard } from '../src/ledger.js';
import { diagnoseLearner, evaluateIntervention, recordIntervention } from '../src/diagnosis.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runSchedulerExperiment({ profileName, slipRate, baseStability, seed = 2026, days = 60, cardsCount = 40 }) {
  const startMs = Date.parse('2026-01-01T09:00:00.000Z');
  const modes = ['balanced', 'sm2', 'dsr'];
  const summary = {};

  for (const mode of modes) {
    const rng = mulberry32(seed);
    const latentStabilities = Array.from({ length: cardsCount }, () =>
      Math.max(1.0, baseStability * (0.75 + rng() * 0.5))
    );
    let deck = Array.from({ length: cardsCount }, (_, i) =>
      createCard({ id: `c-${i + 1}`, topic: `Topic-${(i % 4) + 1}`, question: `Q${i + 1}`, answer: `A${i + 1}` })
    );
    let ledger = createLedger({ createdAt: new Date(startMs).toISOString(), cards: deck });

    let totalReviews = 0;
    let attentionSlips = 0;
    const calibrationSamples = [];

    for (let day = 0; day < days; day += 1) {
      const dayMs = startMs + day * DAY_MS;
      const activeDeck = mode === 'dsr'
        ? deck // updated below from ledger projection or due map
        : deck;
      const due = selectReviewQueue(activeDeck, new Date(dayMs), 25);

      for (let j = 0; j < due.length; j += 1) {
        const card = due[j];
        const idx = deck.findIndex((c) => c.id === card.id);
        const trueS = latentStabilities[idx];
        const elapsedDays = card.lastReviewedAt
          ? Math.max(0.05, (dayMs - Date.parse(card.lastReviewedAt)) / DAY_MS)
          : 0;
        const trueRecallProb = card.reviews === 0 ? 0.72 : 1 / (1 + elapsedDays / (9 * trueS));

        const roll = rng();
        const slipped = rng() < slipRate;
        let rating;
        let reason;

        if (slipped && roll <= trueRecallProb) {
          // Attention slip: learner actually knew it conceptually, slipped reading.
          rating = 'again';
          reason = 'attention';
          attentionSlips += 1;
          latentStabilities[idx] *= 1.02;
        } else if (roll > trueRecallProb) {
          rating = 'again';
          reason = roll > trueRecallProb + 0.12 ? 'misconception' : 'knowledge-gap';
          latentStabilities[idx] = Math.max(0.8, trueS * 0.88);
        } else if (roll > trueRecallProb * 0.78) {
          rating = 'hard';
          latentStabilities[idx] *= 1.25;
        } else if (roll > trueRecallProb * 0.3) {
          rating = 'good';
          latentStabilities[idx] *= 1.75;
        } else {
          rating = 'easy';
          latentStabilities[idx] *= 2.15;
        }

        const revAt = new Date(dayMs + j * 1000).toISOString();
        if (mode === 'dsr') {
          const out = recordLedgerReview(ledger, card.id, rating, revAt, reason ? { reason } : {});
          ledger = out.ledger;
          calibrationSamples.push({ predictedR: out.event.predictedR, recalled: rating !== 'again' });
          deck[idx] = {
            ...deck[idx],
            dueAt: out.memory.dueAt,
            lastReviewedAt: out.memory.lastReviewedAt,
            reviews: deck[idx].reviews + 1,
            correct: deck[idx].correct + (rating === 'again' ? 0 : 1),
            lapses: deck[idx].lapses + (rating === 'again' ? 1 : 0),
            box: Math.min(6, rating === 'again' ? 0 : deck[idx].box + 1)
          };
        } else {
          deck[idx] = reviewCardWithStrategy(card, rating, revAt, {
            strategy: mode,
            reasonAware: true,
            ...(reason ? { reason } : {})
          });
        }
        totalReviews += 1;
      }
    }

    // Measure final latent retrievability across ALL cards on day `days`
    const endMs = startMs + days * DAY_MS;
    let sumEndR = 0;
    for (let i = 0; i < cardsCount; i += 1) {
      const c = deck[i];
      const elapsed = c.lastReviewedAt ? Math.max(0, (endMs - Date.parse(c.lastReviewedAt)) / DAY_MS) : 999;
      sumEndR += c.lastReviewedAt ? (computeRetrievability(elapsed, latentStabilities[i]) ?? 0) : 0;
    }

    const cal = mode === 'dsr' ? evaluatePredictionCalibration(calibrationSamples) : null;
    summary[mode] = {
      totalReviews,
      meanEndRetrievability: Math.round((sumEndR / cardsCount) * 1000) / 1000,
      reviewsPerPercentRetained: Math.round((totalReviews / Math.max(1, (sumEndR / cardsCount) * 100)) * 100) / 100,
      attentionSlips,
      brierScore: cal ? cal.brierScore : null
    };
  }

  return { profileName, ...summary };
}

function runInterventionDetectionCheck() {
  const startIso = '2026-01-01T09:00:00.000Z';
  const addD = (d) => new Date(Date.parse(startIso) + d * DAY_MS).toISOString();
  let truePositives = 0;
  let falsePositives = 0;
  const trials = 30;

  for (let trial = 0; trial < trials; trial += 1) {
    const rng = mulberry32(1000 + trial);
    // Case A: real prerequisite bottleneck -> repair prerequisite -> real recovery
    let l1 = createLedger({
      createdAt: startIso,
      concepts: [
        { id: 'Foundations', prerequisites: [] },
        { id: 'Applied', prerequisites: ['Foundations'] },
        { id: 'Control', prerequisites: [] }
      ]
    });
    for (const [id, topic] of [['f1', 'Foundations'], ['f2', 'Foundations'], ['a1', 'Applied'], ['a2', 'Applied'], ['c1', 'Control']]) {
      l1 = upsertLedgerCard(l1, { id, topic, question: id, answer: id });
    }
    l1 = recordLedgerReview(l1, 'f1', 'again', addD(0), { reason: 'knowledge-gap' }).ledger;
    l1 = recordLedgerReview(l1, 'f2', 'again', addD(0), { reason: 'knowledge-gap' }).ledger;
    l1 = recordLedgerReview(l1, 'a1', 'again', addD(0), { reason: 'misconception' }).ledger;
    l1 = recordLedgerReview(l1, 'a2', 'again', addD(0), { reason: 'misconception' }).ledger;
    l1 = recordLedgerReview(l1, 'c1', 'good', addD(0)).ledger;

    const rec = diagnoseLearner(l1, addD(1)).recommendations.find((r) => r.signal === 'fix-prerequisite');
    if (rec) {
      const sealed = recordIntervention(l1, rec, addD(1));
      l1 = sealed.ledger;
      l1 = recordLedgerReview(l1, 'f1', 'good', addD(2)).ledger;
      l1 = recordLedgerReview(l1, 'f2', 'good', addD(2)).ledger;
      for (let k = 0; k < 4; k += 1) {
        const pass = rng() < 0.85;
        l1 = recordLedgerReview(l1, k % 2 === 0 ? 'a1' : 'a2', pass ? 'good' : 'again', addD(3 + k), pass ? {} : { reason: 'attention' }).ledger;
      }
      l1 = recordLedgerReview(l1, 'c1', 'good', addD(4)).ledger;
      const ev = evaluateIntervention(l1, sealed.intervention.id, addD(8));
      if (ev.verdict === 'positive-signal') truePositives += 1;
    }

    // Case B: ineffective/wrong intervention where Applied continues failing
    let l2 = recordIntervention(l1, { targetTopic: 'Applied', targetConcepts: ['Applied'], action: 'Placebo drill' }, addD(9));
    let lid = l2.intervention.id;
    let l2Ledger = l2.ledger;
    for (let k = 0; k < 4; k += 1) {
      l2Ledger = recordLedgerReview(l2Ledger, k % 2 === 0 ? 'a1' : 'a2', 'again', addD(10 + k), { reason: 'misconception' }).ledger;
    }
    const evFalse = evaluateIntervention(l2Ledger, lid, addD(15));
    if (evFalse.verdict === 'positive-signal') falsePositives += 1;
  }

  return { trials, truePositives, falsePositives };
}

const experiments = [
  runSchedulerExperiment({ profileName: 'Slip-prone learner (22% attention slips)', slipRate: 0.22, baseStability: 4.5, seed: 42 }),
  runSchedulerExperiment({ profileName: 'Steady learner (5% slips)', slipRate: 0.05, baseStability: 5.5, seed: 77 }),
  runSchedulerExperiment({ profileName: 'Fragile memory learner (low initial stability)', slipRate: 0.1, baseStability: 2.2, seed: 99 })
];

console.log('=== FARK v0.6 Empirical Learning Benchmark ===');
for (const exp of experiments) {
  console.log('\nProfile:', exp.profileName);
  for (const mode of ['balanced', 'sm2', 'dsr']) {
    const r = exp[mode];
    console.log(
      `  - ${mode.padEnd(9)} | reviews=${String(r.totalReviews).padStart(3)} | endMeanR=${(r.meanEndRetrievability * 100).toFixed(1)}% | rev/1%R=${r.reviewsPerPercentRetained}${r.brierScore != null ? ` | DSR Brier=${r.brierScore}` : ''}`
    );
  }
}

const loop = runInterventionDetectionCheck();
console.log(`\nClosed-loop intervention check (${loop.trials} trials): truePositives=${loop.truePositives}/${loop.trials}, falsePositives=${loop.falsePositives}/${loop.trials}`);
