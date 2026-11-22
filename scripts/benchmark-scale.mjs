/**
 * Gate G repeatable scale benchmark: measures wall-clock time and heap usage
 * across 1k, 10k, and 100k deterministic review events using fixed seeds.
 * Never fabricates results; prints real hardware & Node runtime metadata.
 */
import { performance } from 'node:perf_hooks';
import { createCard } from '../src/index.js';
import { createLedger, recordLedgerReview } from '../src/ledger.js';
import { diagnoseLearner } from '../src/diagnosis.js';
import { replayReviewStream } from '../src/calibrate.js';
import { createMemoryState, updateDsrMemory } from '../src/memory.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSyntheticEvents(count, seed = 202607) {
  const rand = mulberry32(seed);
  const topics = ['Mathematics', 'Algorithms', 'English', 'Biology'];
  const ratings = ['again', 'hard', 'good', 'easy'];
  const cardCount = Math.min(250, Math.max(20, Math.floor(count / 20)));
  const cards = [];
  for (let i = 0; i < cardCount; i++) {
    cards.push(createCard({
      id: `bench-c-${i}`,
      topic: topics[i % topics.length],
      question: `Synthetic prompt #${i}`,
      answer: `Synthetic answer #${i}`
    }));
  }
  const events = [];
  let ts = Date.parse('2026-01-01T08:00:00.000Z');
  for (let i = 0; i < count; i++) {
    ts += Math.floor(rand() * 3_600_000) + 60_000;
    const r = rand();
    const rating = r < 0.18 ? 'again' : r < 0.35 ? 'hard' : r < 0.85 ? 'good' : 'easy';
    events.push({
      cardId: cards[i % cardCount].id,
      topic: cards[i % cardCount].topic,
      at: new Date(ts).toISOString(),
      rating,
      ...(rating === 'again' ? { reason: r < 0.09 ? 'misconception' : 'knowledge-gap' } : {})
    });
  }
  return { cards, events };
}

function measureScale(eventCount) {
  const { cards, events } = generateSyntheticEvents(eventCount);
  const heapBefore = process.memoryUsage().heapUsed;

  const t0 = performance.now();
  let scoredPredictions = 0;
  let replayMode = 'single-pass';
  if (eventCount <= 50_000) {
    const replay = replayReviewStream(events, { strategies: ['balanced', 'sm2', 'dsr'] });
    const dsrEntry = replay.strategies.find(s => s.strategy === 'dsr');
    scoredPredictions = dsrEntry?.sampleCount ?? 0;
  } else {
    // Verify built-in DoS guard rejects >50k in one batch, then measure 50k-chunked throughput
    let guardRejected = false;
    try {
      replayReviewStream(events, { strategies: ['dsr'] });
    } catch (err) {
      guardRejected = err instanceof RangeError;
    }
    replayMode = guardRejected ? 'chunked-50k (MAX_EVENTS=50000 guard verified)' : 'chunked-50k';
    for (let offset = 0; offset < events.length; offset += 50_000) {
      const slice = events.slice(offset, offset + 50_000);
      const replay = replayReviewStream(slice, { strategies: ['balanced', 'sm2', 'dsr'] });
      const dsrEntry = replay.strategies.find(s => s.strategy === 'dsr');
      scoredPredictions += dsrEntry?.sampleCount ?? 0;
    }
  }
  const replayMs = performance.now() - t0;

  // Measure raw DSR core update throughput across all N events (O(N))
  const dsrStart = performance.now();
  const memMap = new Map();
  for (const ev of events) {
    const prev = memMap.get(ev.cardId) ?? createMemoryState();
    const res = updateDsrMemory(prev, ev.rating, ev.at, ev.reason ? { reason: ev.reason } : {});
    memMap.set(ev.cardId, res.state);
  }
  const dsrCoreMs = performance.now() - dsrStart;

  let ledgerAppendMs = null;
  let diagnoseMs = null;
  if (eventCount <= 1_000) {
    let ledger = createLedger({ cards, createdAt: '2026-01-01T00:00:00.000Z' });
    const l0 = performance.now();
    for (const ev of events) {
      ledger = recordLedgerReview(ledger, ev.cardId, ev.rating, ev.at, ev.reason ? { reason: ev.reason } : {}).ledger;
    }
    ledgerAppendMs = performance.now() - l0;
    const d0 = performance.now();
    diagnoseLearner(ledger, events[events.length - 1].at);
    diagnoseMs = performance.now() - d0;
  } else if (eventCount <= 10_000) {
    // Immutable per-event structuredClone in recordLedgerReview is O(N^2) above ~1k sequential appends;
    // benchmark diagnoseLearner directly on a structurally valid 10k-event ledger and document the O(N^2) append bound.
    const ledger = createLedger({ cards, createdAt: '2026-01-01T00:00:00.000Z' });
    const cardState = new Map();
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const prevReps = (cardState.get(ev.cardId) ?? 0) + 1;
      cardState.set(ev.cardId, prevReps);
      ledger.events.push({
        id: `rev-${i + 1}-${ev.cardId}`,
        type: 'review',
        at: ev.at,
        cardId: ev.cardId,
        topic: ev.topic,
        concepts: [ev.topic],
        rating: ev.rating,
        ...(ev.reason ? { reason: ev.reason } : {}),
        elapsedDays: 1,
        predictedR: 0.85,
        intervalDays: 3,
        memoryAfter: {
          stabilityDays: 4.5,
          difficulty: 5.0,
          lastReviewedAt: ev.at,
          dueAt: new Date(Date.parse(ev.at) + 3 * 86_400_000).toISOString(),
          reps: prevReps,
          lapses: ev.rating === 'again' ? 1 : 0
        }
      });
    }
    const d0 = performance.now();
    diagnoseLearner(ledger, events[events.length - 1].at);
    diagnoseMs = performance.now() - d0;
  }

  const heapAfter = process.memoryUsage().heapUsed;
  return {
    events: eventCount,
    replayMode,
    replayMs: Number(replayMs.toFixed(2)),
    dsrCoreMs: Number(dsrCoreMs.toFixed(2)),
    scoredPredictions,
    ledgerAppendMs: ledgerAppendMs === null ? 'skipped (O(N^2) structuredClone above 1k)' : Number(ledgerAppendMs.toFixed(2)),
    diagnoseMs: diagnoseMs === null ? 'skipped (>10k ledger scope)' : Number(diagnoseMs.toFixed(2)),
    heapDeltaMB: Number(((heapAfter - heapBefore) / (1024 * 1024)).toFixed(2))
  };
}

const scales = [1_000, 10_000, 50_000, 100_000];
const report = {
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    seed: 202607,
    measuredAt: new Date().toISOString()
  },
  results: scales.map(measureScale)
};

console.log(JSON.stringify(report, null, 2));
