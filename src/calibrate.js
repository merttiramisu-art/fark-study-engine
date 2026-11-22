/**
 * Zero-dependency external event-stream replay & personalized DSR parameter calibration.
 * Lets learners, educators, and external tools replay real chronological review logs
 * across Balanced, SM-2, and DSR, and fit forgetting-speed parameters at 0 TL cost.
 */
import { createCard, MISTAKE_REASONS } from './index.js';
import { validateLedger } from './ledger.js';
import {
  computeRetrievability,
  createMemoryState,
  DSR_DEFAULTS,
  evaluatePredictionCalibration,
  updateDsrMemory
} from './memory.js';
import { reviewCardWithStrategy } from './strategies.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RATINGS = new Set(['again', 'hard', 'good', 'easy']);
const REASONS = new Set(MISTAKE_REASONS);
const REPLAY_STRATEGIES = new Set(['balanced', 'sm2', 'dsr']);
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;
const MAX_EVENTS = 50_000;
const MAX_CHARS = 2_000_000;

function round(value, digits = 4) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function parseTimestampMs(at, field = 'at') {
  const d = at instanceof Date ? new Date(at.getTime()) : new Date(at);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(field + ' must be a valid date');
  }
  return d.getTime();
}

function parseCsvRecords(input) {
  if (typeof input !== 'string') throw new TypeError('CSV input must be a string');
  if (input.length > MAX_CHARS) throw new RangeError('review log exceeds maximum size');
  const text = input.startsWith('\uFEFF') ? input.slice(1) : input;
  if (!text.trim()) throw new RangeError('review log is empty');

  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let sawQuote = false;
  let justClosedQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
          justClosedQuote = true;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (justClosedQuote) {
      if (ch === ',') {
        row.push(field);
        field = '';
        justClosedQuote = false;
        sawQuote = false;
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        records.push(row);
        row = [];
        field = '';
        justClosedQuote = false;
        sawQuote = false;
      } else {
        throw new SyntaxError('unexpected character after closing quote in review log CSV');
      }
      continue;
    }
    if (ch === '"' && field === '' && !sawQuote) {
      inQuotes = true;
      sawQuote = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      sawQuote = false;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      records.push(row);
      row = [];
      field = '';
      sawQuote = false;
    } else if (ch === '"') {
      throw new SyntaxError('unexpected quote inside unquoted CSV field');
    } else {
      field += ch;
    }
  }
  if (inQuotes) throw new SyntaxError('unterminated quote in review log CSV');
  if (field !== '' || row.length > 0 || sawQuote) {
    row.push(field);
    records.push(row);
  }
  return records.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function escapeCsvCell(value) {
  let text = String(value ?? '');
  if (CSV_FORMULA_PREFIX.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function validateAndSortEvents(events) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  if (events.length > MAX_EVENTS) throw new RangeError(`events exceed maximum of ${MAX_EVENTS}`);

  const normalized = events.map((raw, idx) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError(`event[${idx}] must be an object`);
    }
    const cardId = String(raw.cardId ?? '').trim();
    if (!cardId) throw new RangeError(`event[${idx}].cardId must be a non-empty string`);
    const atMs = parseTimestampMs(raw.at, `event[${idx}].at`);
    const rating = String(raw.rating ?? '').trim();
    if (!RATINGS.has(rating)) {
      throw new RangeError(`event[${idx}].rating must be again, hard, good, or easy`);
    }
    const reason = raw.reason != null && String(raw.reason).trim() !== '' ? String(raw.reason).trim() : undefined;
    if (reason !== undefined && (!REASONS.has(reason) || rating !== 'again')) {
      throw new RangeError(`event[${idx}].reason is only valid on an again review`);
    }
    const topic = raw.topic != null && String(raw.topic).trim() !== '' ? String(raw.topic).trim() : 'General';
    return {
      cardId,
      topic,
      at: new Date(atMs).toISOString(),
      atMs,
      rating,
      ...(reason !== undefined ? { reason } : {}),
      _index: idx
    };
  });

  normalized.sort((a, b) => a.atMs - b.atMs || a._index - b._index);
  return normalized.map(({ _index, ...rest }) => rest);
}

/** Normalize either a validated `LearningLedger` or external review events into chronological events. */
export function normalizeReviewEvents(input) {
  if (Array.isArray(input)) {
    return validateAndSortEvents(input);
  }
  validateLedger(input);
  const raw = input.events
    .filter((ev) => ev.type === 'review')
    .map((ev) => ({
      cardId: ev.cardId,
      topic: ev.topic ?? input.cards[ev.cardId]?.topic ?? 'General',
      at: ev.at,
      rating: ev.rating,
      ...(ev.reason !== undefined ? { reason: ev.reason } : {})
    }));
  return validateAndSortEvents(raw);
}

/** Parse external RFC 4180 CSV review logs (`cardId,at,rating[,reason][,topic]`) into chronological events. */
export function parseReviewLogCsv(csvText) {
  const rows = parseCsvRecords(csvText);
  if (rows.length < 2) throw new RangeError('review log CSV must contain header and at least one row');

  const header = rows[0].map((col) => col.trim());
  const allowed = new Set(['cardId', 'topic', 'at', 'rating', 'reason']);
  const idxMap = new Map();
  header.forEach((col, idx) => {
    if (!allowed.has(col)) throw new RangeError('unknown review log CSV column: ' + col);
    if (idxMap.has(col)) throw new RangeError('duplicate review log CSV column: ' + col);
    idxMap.set(col, idx);
  });
  for (const req of ['cardId', 'at', 'rating']) {
    if (!idxMap.has(req)) throw new RangeError('missing required review log CSV column: ' + req);
  }

  const events = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length !== header.length) {
      throw new RangeError(`CSV row ${i + 1} has ${row.length} columns; expected ${header.length}`);
    }
    const reason = idxMap.has('reason') ? row[idxMap.get('reason')].trim() : '';
    const topic = idxMap.has('topic') ? row[idxMap.get('topic')].trim() : '';
    events.push({
      cardId: row[idxMap.get('cardId')],
      at: row[idxMap.get('at')],
      rating: row[idxMap.get('rating')],
      ...(reason ? { reason } : {}),
      ...(topic ? { topic } : {})
    });
  }
  return validateAndSortEvents(events);
}

/** Parse newline-delimited JSON (`.jsonl`) review logs into chronological events. */
export function parseReviewLogJsonl(jsonlText) {
  if (typeof jsonlText !== 'string') throw new TypeError('JSONL input must be a string');
  if (jsonlText.length > MAX_CHARS) throw new RangeError('JSONL review log exceeds maximum size');
  const lines = jsonlText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new RangeError('JSONL review log is empty');
  const parsed = lines.map((line, i) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new SyntaxError(`invalid JSON on review log line ${i + 1}`);
    }
  });
  return validateAndSortEvents(parsed);
}

/** Export ledger or review events as a formula-safe chronological CSV log. */
export function exportReviewLogCsv(input) {
  const events = normalizeReviewEvents(input);
  const lines = ['cardId,topic,at,rating,reason'];
  for (const ev of events) {
    lines.push([
      escapeCsvCell(ev.cardId),
      escapeCsvCell(ev.topic),
      escapeCsvCell(ev.at),
      escapeCsvCell(ev.rating),
      escapeCsvCell(ev.reason ?? '')
    ].join(','));
  }
  return lines.join('\n') + '\n';
}

function replaySingleStrategy(events, strategy, dsrParams, returnSamples = false) {
  const samples = [];
  let earlyReviews = 0;
  let onWindowReviews = 0;
  let overdueReviews = 0;

  if (strategy === 'dsr') {
    const states = new Map();
    for (const ev of events) {
      const prev = states.get(ev.cardId) ?? createMemoryState();
      if (prev.reps > 0 && prev.dueAt != null) {
        const dueMs = Date.parse(prev.dueAt);
        const diffDays = (ev.atMs - dueMs) / DAY_MS;
        if (diffDays < -0.25) earlyReviews++;
        else if (diffDays <= 1.0) onWindowReviews++;
        else overdueReviews++;
      }
      const res = updateDsrMemory(prev, ev.rating, ev.at, {
        ...(ev.reason !== undefined ? { reason: ev.reason } : {}),
        ...(dsrParams !== undefined ? { params: dsrParams } : {})
      });
      samples.push({ predictedR: res.predictedR, recalled: ev.rating !== 'again' });
      states.set(ev.cardId, res.state);
    }
  } else {
    const cards = new Map();
    for (const ev of events) {
      let card = cards.get(ev.cardId);
      if (!card) {
        card = createCard({ id: ev.cardId, topic: ev.topic, question: ev.cardId, answer: ev.cardId });
        samples.push({ predictedR: null, recalled: ev.rating !== 'again' });
      } else {
        const prevMs = Date.parse(card.lastReviewedAt);
        const dueMs = Date.parse(card.dueAt);
        const scheduledDays = Math.max(0.05, (dueMs - prevMs) / DAY_MS);
        const elapsedDays = Math.max(0, (ev.atMs - prevMs) / DAY_MS);
        const predictedR = computeRetrievability(elapsedDays, scheduledDays);
        samples.push({ predictedR, recalled: ev.rating !== 'again' });

        const diffDays = (ev.atMs - dueMs) / DAY_MS;
        if (diffDays < -0.25) earlyReviews++;
        else if (diffDays <= 1.0) onWindowReviews++;
        else overdueReviews++;
      }
      card = reviewCardWithStrategy(card, ev.rating, ev.at, {
        strategy,
        reasonAware: true,
        ...(ev.reason !== undefined ? { reason: ev.reason } : {})
      });
      cards.set(ev.cardId, card);
    }
  }

  const cal = evaluatePredictionCalibration(samples);
  const report = {
    strategy,
    ...cal,
    timing: {
      earlyReviews,
      onWindowReviews,
      overdueReviews
    }
  };
  return returnSamples ? { report, samples } : report;
}

/**
 * Replay chronological review events across scheduling strategies without rewriting history,
 * comparing empirical recall prediction accuracy (Brier score, log loss, and timing alignment).
 */
export function replayReviewStream(input, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const events = normalizeReviewEvents(input);
  const requested = options.strategies ?? ['balanced', 'sm2', 'dsr'];
  if (!Array.isArray(requested) || !requested.length) {
    throw new TypeError('strategies must be a non-empty array');
  }
  for (const s of requested) {
    if (!REPLAY_STRATEGIES.has(s)) throw new RangeError('unsupported replay strategy: ' + s);
  }

  const distinctCards = new Set(events.map((e) => e.cardId)).size;
  const strategies = [...new Set(requested)].map((s) =>
    replaySingleStrategy(events, s, options.dsrParams)
  );

  return {
    totalEvents: events.length,
    distinctCards,
    dsrParams: options.dsrParams ?? {
      initialStabilityScale: DSR_DEFAULTS.defaultInitialStabilityScale,
      stabilityGainScale: DSR_DEFAULTS.defaultStabilityGainScale
    },
    strategies,
    caveat: 'Replays empirical review intervals; balanced/SM-2 predictedR uses implied interval at 90% retention.'
  };
}

function penalizedObjective(brier, params, reg) {
  const d0 = params.initialStabilityScale - 1;
  const d1 = params.stabilityGainScale - 1;
  return brier + reg * (d0 * d0 + d1 * d1);
}

function searchOptimalParams(events, defaultParams, baseline, regularization) {
  const initGrid = [0.45, 0.65, 0.85, 1.0, 1.25, 1.55, 1.9];
  const gainGrid = [0.55, 0.75, 0.9, 1.0, 1.15, 1.35, 1.6];

  let bestParams = { ...defaultParams };
  let bestResult = baseline;
  let bestObj = penalizedObjective(baseline.brierScore, defaultParams, regularization);

  for (const s0 of initGrid) {
    for (const g of gainGrid) {
      const candidate = { initialStabilityScale: s0, stabilityGainScale: g };
      const res = replaySingleStrategy(events, 'dsr', candidate);
      const obj = penalizedObjective(res.brierScore, candidate, regularization);
      if (obj < bestObj - 1e-6) {
        bestObj = obj;
        bestParams = candidate;
        bestResult = res;
      }
    }
  }

  const offsets = [-0.1, -0.05, 0, 0.05, 0.1];
  const anchor = { ...bestParams };
  for (const ds of offsets) {
    for (const dg of offsets) {
      const s0 = round(Math.min(2.2, Math.max(0.35, anchor.initialStabilityScale + ds)), 2);
      const g = round(Math.min(2.0, Math.max(0.4, anchor.stabilityGainScale + dg)), 2);
      const candidate = { initialStabilityScale: s0, stabilityGainScale: g };
      const res = replaySingleStrategy(events, 'dsr', candidate);
      const obj = penalizedObjective(res.brierScore, candidate, regularization);
      if (obj < bestObj - 1e-6) {
        bestObj = obj;
        bestParams = candidate;
        bestResult = res;
      }
    }
  }
  return { params: bestParams, result: bestResult };
}

/**
 * Fit learner-specific DSR forgetting-speed scales (`initialStabilityScale`, `stabilityGainScale`)
 * locally at 0 TL using L2-regularized grid + neighborhood search over chronological review events.
 */
export function fitLearnerParameters(input, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const minSamples = options.minSamples ?? 8;
  const regularization = options.regularization ?? 0.004;
  if (!Number.isSafeInteger(minSamples) || minSamples < 3) {
    throw new RangeError('minSamples must be an integer >= 3');
  }
  if (!Number.isFinite(regularization) || regularization < 0) {
    throw new RangeError('regularization must be a non-negative finite number');
  }

  const events = normalizeReviewEvents(input);
  const defaultParams = {
    initialStabilityScale: DSR_DEFAULTS.defaultInitialStabilityScale,
    stabilityGainScale: DSR_DEFAULTS.defaultStabilityGainScale
  };
  const baseline = replaySingleStrategy(events, 'dsr', defaultParams);

  if (baseline.sampleCount < minSamples || baseline.brierScore == null) {
    return {
      fitted: false,
      improved: false,
      reason: 'insufficient-scored-reviews',
      minRequired: minSamples,
      sampleCount: baseline.sampleCount,
      params: defaultParams,
      baseline,
      fittedResult: baseline,
      brierDelta: 0,
      logLossDelta: 0,
      holdout: null,
      caveat: `Need at least ${minSamples} repeat review predictions to avoid overfitting tiny history.`
    };
  }

  const { params: bestParams, result: bestResult } = searchOptimalParams(
    events,
    defaultParams,
    baseline,
    regularization
  );

  const improved =
    bestParams.initialStabilityScale !== defaultParams.initialStabilityScale ||
    bestParams.stabilityGainScale !== defaultParams.stabilityGainScale;

  let holdout = null;
  if (events.length >= 20) {
    const split = Math.floor(events.length * 0.7);
    const prefixBase = replaySingleStrategy(events.slice(0, split), 'dsr', defaultParams);
    if (prefixBase.sampleCount >= minSamples && prefixBase.brierScore != null) {
      const prefixFit = searchOptimalParams(events.slice(0, split), defaultParams, prefixBase, regularization);
      const baseAll = replaySingleStrategy(events, 'dsr', defaultParams, true);
      const fitAll = replaySingleStrategy(events, 'dsr', prefixFit.params, true);
      const tailBase = evaluatePredictionCalibration(baseAll.samples.slice(split));
      const tailFit = evaluatePredictionCalibration(fitAll.samples.slice(split));
      if (tailBase.brierScore != null && tailFit.brierScore != null) {
        holdout = {
          sampleCount: tailFit.sampleCount,
          baselineBrier: tailBase.brierScore,
          fittedBrier: tailFit.brierScore
        };
      }
    }
  }

  return {
    fitted: true,
    improved,
    reason: improved ? 'calibrated' : 'baseline-already-optimal',
    minRequired: minSamples,
    sampleCount: baseline.sampleCount,
    params: bestParams,
    baseline,
    fittedResult: bestResult,
    brierDelta: round(bestResult.brierScore - baseline.brierScore, 4),
    logLossDelta: round(bestResult.logLoss - baseline.logLoss, 4),
    holdout,
    caveat:
      baseline.sampleCount < 30
        ? 'Small sample (<30 scored predictions); regularized toward default (1.0, 1.0) to avoid overfitting.'
        : 'Fitted offline via deterministic grid search with L2 regularization.'
  };
}
