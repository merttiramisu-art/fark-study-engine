/**
 * V6.1 reproducible, opt-in synthetic review-stream benchmark.
 * No private content or learner data; no network and no runtime dependencies.
 */
import { createHash } from 'node:crypto';
import { replayReviewStream } from '../src/calibrate.js';

const DAY_MS = 86_400_000;
const START = Date.parse('2026-01-01T09:00:00.000Z');
const SUPPORTED_SIZES = new Set([1000, 10000, 50000, 100000]);
// Mirrors the current review replay input cap in src/calibrate.js.
const REPLAY_EVENT_LIMIT = 50000;

function positiveInteger(text, label, maximum) {
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw new RangeError(label + ' must be an integer between 1 and ' + maximum);
  }
  return number;
}

function options(argv) {
  const result = { sizes: [1000, 10000, 50000, 100000], runs: 3, seed: 42 };
  for (const argument of argv) {
    if (argument === '--help') return null;
    if (argument.startsWith('--sizes=')) {
      const values = argument.slice(8).split(',').map(value => positiveInteger(value, 'size', 100000));
      if (values.some(n => !SUPPORTED_SIZES.has(n)) || new Set(values).size !== values.length) {
        throw new RangeError('sizes must be distinct values from 1000,10000,50000,100000');
      }
      result.sizes = values;
    } else if (argument.startsWith('--runs=')) {
      result.runs = positiveInteger(argument.slice(7), 'runs', 10);
    } else if (argument.startsWith('--seed=')) {
      result.seed = positiveInteger(argument.slice(7), 'seed', 2147483647);
    } else {
      throw new RangeError('unsupported argument: ' + argument);
    }
  }
  return result;
}

function generateEvents(count, seed) {
  let state = seed >>> 0;
  function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  }
  const events = [];
  for (let i = 0; i < count; i++) {
    const choice = next() % 10;
    const rating = choice < 2 ? 'again' : choice < 4 ? 'hard' : choice < 8 ? 'good' : 'easy';
    const at = new Date(START + Math.floor(i / 96) * DAY_MS + (i % 96) * 60000).toISOString();
    events.push({
      cardId: 'synthetic-' + (i % 96),
      topic: 'Original synthetic arithmetic',
      at,
      rating,
      ...(rating === 'again' ? { reason: choice === 0 ? 'knowledge-gap' : 'attention' } : {})
    });
  }
  return events;
}

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

function percentile(sorted, fraction) {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function benchmark(count, config) {
  if (count > REPLAY_EVENT_LIMIT) {
    return {
      events: count,
      status: 'unsupported',
      limit: REPLAY_EVENT_LIMIT,
      reason: 'Current replay API rejects more than 50000 events; no timing generated'
    };
  }

  const events = generateEvents(count, config.seed);
  const fixtureSha256 = createHash('sha256').update(JSON.stringify(events)).digest('hex');
  const measurements = [];
  let sampleCountByStrategy = null;
  for (let run = 0; run < config.runs; run++) {
    const before = process.memoryUsage();
    const start = process.hrtime.bigint();
    const report = replayReviewStream(events);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const after = process.memoryUsage();
    if (report.totalEvents !== count) throw new Error('Benchmark event count mismatch');
    sampleCountByStrategy = report.strategies.map(x => ({ strategy: x.strategy, sampleCount: x.sampleCount }));
    measurements.push({
      elapsedMs: rounded(elapsedMs),
      heapDeltaBytes: after.heapUsed - before.heapUsed,
      rssDeltaBytes: after.rss - before.rss
    });
  }
  const orderedMs = measurements.map(r => r.elapsedMs).sort((a, b) => a - b);
  return {
    events: count,
    status: 'measured',
    fixtureSha256,
    runs: measurements.length,
    sampleCountByStrategy,
    medianMs: rounded(percentile(orderedMs, 0.5)),
    p95Ms: rounded(percentile(orderedMs, 0.95)),
    measurements
  };
}

function main() {
  const config = options(process.argv.slice(2));
  if (config === null) {
    process.stdout.write('Usage: npm run bench:learning -- --sizes=1000,10000,50000,100000 --runs=3 --seed=42\n');
    return;
  }
  const results = config.sizes.map(size => benchmark(size, config));
  process.stdout.write(JSON.stringify({
    name: 'fark-learning-replay-benchmark',
    synthetic: true,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    seed: config.seed,
    runs: config.runs,
    disclaimer: 'Observational runtime and memory metrics on synthetic review events; not learning effectiveness or a fixed performance guarantee.',
    results
  }, null, 2) + '\n');
}
main();
