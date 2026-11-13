/**
 * Zero-dependency CLI for initializing, studying, validating, summarizing,
 * planning, forecasting, comparing strategies, and converting FARK decks.
 */
import { readFileSync } from 'node:fs';
import { access, readFile, stat, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  createCard,
  getMistakeBreakdown,
  getReviewForecast,
  getStudySummary,
  getTopicSummaries,
  MISTAKE_REASONS
} from './index.js';
import { planStudySession } from './planner.js';
import { exportStudyDeck, importStudyDeck, PORTABLE_LIMITS } from './portable.js';
import { exportStudyCsv, importStudyCsv } from './csv.js';
import { exportStudyMarkdown, importStudyMarkdown } from './markdown.js';
import {
  compareStrategies,
  getReviewStrategy,
  reviewCardWithStrategy,
  STRATEGY_IDS
} from './strategies.js';

const PACKAGE_JSON = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
export const CLI_VERSION = PACKAGE_JSON.version;

const HELP_TEXT = `FARK Study Engine CLI v${CLI_VERSION}

Usage:
  fark init     <file> [--format json|csv|md] [--force]
  fark study    <file> [--format json|csv|md] [--at <iso>] [--limit N] [--topic-limit N] [--new-limit N] [--strategy balanced|gentle|intensive] [--save] [--out <file>]
  fark validate <file> [--format json|csv|md] [--json]
  fark summary  <file> [--format json|csv|md] [--at <iso>] [--json]
  fark plan     <file> [--format json|csv|md] [--at <iso>] [--limit N] [--topic-limit N] [--new-limit N] [--json]
  fark forecast <file> [--format json|csv|md] [--at <iso>] [--days N] [--json]
  fark compare  <ratings...> [--strategies balanced,gentle,intensive] [--at <iso>] [--json]
  fark convert  <file> --to <json|csv|md> [--format json|csv|md] [--out <file>] [--escape-formulas] [--include-stats] [--collapsible]
  fark --help | --version`;

const VALUE_FLAGS = new Set([
  'format', 'at', 'limit', 'topic-limit', 'new-limit', 'days', 'to', 'out', 'strategy', 'strategies'
]);
const BOOL_FLAGS = new Set([
  'json', 'escape-formulas', 'include-stats', 'collapsible', 'save', 'force', 'help', 'version'
]);
const COMMAND_FLAGS = {
  init: new Set(['format', 'force']),
  study: new Set(['format', 'at', 'limit', 'topic-limit', 'new-limit', 'strategy', 'save', 'out']),
  validate: new Set(['format', 'json']),
  summary: new Set(['format', 'at', 'json']),
  plan: new Set(['format', 'at', 'limit', 'topic-limit', 'new-limit', 'json']),
  forecast: new Set(['format', 'at', 'days', 'json']),
  compare: new Set(['strategies', 'at', 'json']),
  convert: new Set(['format', 'to', 'out', 'escape-formulas', 'include-stats', 'collapsible'])
};

const STARTER_SAMPLES = [
  { id: 'spaced-retrieval', topic: 'Learning Science', question: 'Why is active recall paired with spaced intervals?', answer: 'Practicing retrieval after some forgetting time surfaces genuine gaps before long-term reliance builds.' },
  { id: 'reason-logging', topic: 'Study Habits', question: 'Why should mistake reasons remain self-reported instead of inferred?', answer: 'Only the learner knows whether a lapse came from a missing fact, a misconception, or brief inattention.' },
  { id: 'topic-interleaving', topic: 'Study Habits', question: 'What is the purpose of capping consecutive cards per topic?', answer: 'Topic limits keep a single backlog topic from crowding out other subjects during a bounded session.' },
  { id: 'http-idempotence', topic: 'Networking', question: 'Which HTTP methods are defined as idempotent by specification?', answer: 'GET, HEAD, PUT, DELETE, OPTIONS, and TRACE leave server state unchanged across identical retries.' },
  { id: 'binary-search', topic: 'Algorithms', question: 'What precondition does binary search require before splitting intervals?', answer: 'The searchable sequence must remain monotonic under the comparison relation.' },
  { id: 'event-loop', topic: 'JavaScript', question: 'Why do microtasks run before the next macrotask timer callback?', answer: 'Hosts drain the microtask queue at the end of the current turn before picking the next task.' }
];

const RATING_CHOICES = new Map([
  ['1', 'again'],
  ['a', 'again'],
  ['again', 'again'],
  ['2', 'hard'],
  ['h', 'hard'],
  ['hard', 'hard'],
  ['3', 'good'],
  ['g', 'good'],
  ['good', 'good'],
  ['4', 'easy'],
  ['e', 'easy'],
  ['easy', 'easy']
]);

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '-h') {
      flags.help = true;
      continue;
    }
    if (token === '-v') {
      flags.version = true;
      continue;
    }
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    const name = eq >= 0 ? token.slice(2, eq) : token.slice(2);
    if (BOOL_FLAGS.has(name)) {
      if (eq >= 0) throw new RangeError(`flag --${name} does not accept a value`);
      flags[name] = true;
      continue;
    }
    if (VALUE_FLAGS.has(name)) {
      const value = eq >= 0 ? token.slice(eq + 1) : argv[++i];
      if (value === undefined || (eq < 0 && value.startsWith('--'))) {
        throw new RangeError(`flag --${name} requires a value`);
      }
      flags[name] = value;
      continue;
    }
    throw new RangeError(`unknown flag: --${name}`);
  }
  return { positionals, flags };
}

function parseNonNegativeInt(raw, flagName) {
  if (!/^\d+$/.test(raw)) {
    throw new RangeError(`--${flagName} must be a non-negative integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`--${flagName} exceeds the safe integer range`);
  }
  return value;
}

function inferFormat(filePath, explicitFormat) {
  if (explicitFormat != null) {
    if (explicitFormat !== 'json' && explicitFormat !== 'csv' && explicitFormat !== 'md') {
      throw new RangeError('--format must be json, csv, or md');
    }
    return explicitFormat;
  }
  const ext = extname(filePath).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.csv') return 'csv';
  if (ext === '.md' || ext === '.markdown') return 'md';
  throw new RangeError('cannot infer deck format from extension; pass --format json, csv, or md');
}

function loadDeck(text, format) {
  if (format === 'csv') return importStudyCsv(text);
  if (format === 'md') return importStudyMarkdown(text);
  return importStudyDeck(text);
}

function serializeDeck(cards, format, flags = {}) {
  if (format === 'csv') {
    return exportStudyCsv(cards, { escapeFormulas: !!flags['escape-formulas'] });
  }
  if (format === 'md') {
    return exportStudyMarkdown(cards, {
      includeStats: !!flags['include-stats'],
      collapsibleAnswers: !!flags.collapsible
    });
  }
  return exportStudyDeck(cards);
}

function defaultIo() {
  return {
    async readText(filePath) {
      const info = await stat(filePath);
      if (info.size > PORTABLE_LIMITS.maxChars * 4) {
        throw new RangeError('deck file exceeds maximum supported size');
      }
      return await readFile(filePath, 'utf8');
    },
    async writeText(filePath, content) {
      await writeFile(filePath, content, 'utf8');
    },
    async exists(filePath) {
      try {
        await access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    stdout(text) {
      process.stdout.write(text + '\n');
    },
    stderr(text) {
      process.stderr.write(text + '\n');
    },
    async createPrompter() {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      return {
        prompt(question) {
          return rl.question(question);
        },
        close() {
          rl.close();
        }
      };
    }
  };
}

function formatPercent(value) {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function formatSummaryText(summary, topics, mistakes) {
  const lines = [
    `Deck summary (${summary.total} cards: ${summary.due} due, ${summary.studied} studied, ${summary.new} new, ${summary.mature} mature)`,
    `Reviews: ${summary.totalReviews} recorded, ${summary.correctReviews} positive, accuracy: ${formatPercent(summary.accuracy)}`
  ];
  if (topics.length) {
    lines.push('Topics:');
    for (const topic of topics) {
      lines.push(`  - ${topic.topic}: ${topic.due}/${topic.total} due, reviews=${topic.totalReviews}, accuracy=${formatPercent(topic.accuracy)}`);
    }
  }
  lines.push(
    `Lapses: ${mistakes.totalLapses} total (${mistakes.classified} classified, ${mistakes.unspecified} unspecified)`
  );
  return lines.join('\n');
}

function formatPlanText(plan) {
  const lines = [
    `Session plan: ${plan.plannedCount} selected / ${plan.dueCount} due (${plan.deferredCount} deferred, ${plan.newCardsPlanned} new)`
  ];
  for (const item of plan.planned) {
    lines.push(`  - [${item.status}] ${item.id} (${item.topic}): ${item.reasonCodes.join(', ')}`);
  }
  return lines.join('\n');
}

function formatForecastText(forecast) {
  const lines = [
    `Forecast as of ${forecast.asOf} (${forecast.days}d horizon, ${forecast.total} total cards)`,
    `  dueNow=${forecast.dueNow}, unreviewed=${forecast.unreviewed}, later=${forecast.later}`
  ];
  for (const day of forecast.schedule) {
    const topicText = Object.entries(day.byTopic)
      .map(([topic, count]) => `${topic}: ${count}`)
      .join(', ');
    lines.push(`  - Day ${String(day.day).padStart(2, ' ')} (until ${day.to.slice(0, 10)}): ${day.dueCount} due${topicText ? ' [' + topicText + ']' : ''}`);
  }
  return lines.join('\n');
}

function formatComparisonText(comparison) {
  const lines = [`Strategy comparison (${comparison.strategies[0].steps} review steps starting ${comparison.startedAt})`];
  for (const row of comparison.strategies) {
    const seq = row.timeline.map((step) => `${step.rating}:${step.intervalDays}d`).join(' -> ');
    lines.push(`  - ${row.label}: final box=${row.finalBox}, last interval=${row.finalIntervalDays}d, span=${row.totalSpanDays}d`);
    lines.push(`      ${seq}`);
  }
  lines.push(`Note: ${comparison.disclaimer}`);
  return lines.join('\n');
}

async function pathExists(filePath, io, hasCustomExists, hasCustomReadText) {
  if (hasCustomExists) return await io.exists(filePath);
  if (!hasCustomReadText) {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  try {
    await io.readText(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runInit(positionals, flags, io, ioFlags) {
  if (positionals.length !== 2) {
    throw new RangeError("'init' requires exactly one <file> argument");
  }
  const filePath = positionals[1];
  const format = inferFormat(filePath, flags.format);
  const exists = await pathExists(filePath, io, ioFlags.hasExists, ioFlags.hasReadText);
  if (exists && !flags.force) {
    throw new RangeError(`file already exists: ${filePath} (pass --force to overwrite)`);
  }
  const starterCards = STARTER_SAMPLES.map((item) => createCard(item));
  const content = serializeDeck(starterCards, format, flags);
  await io.writeText(filePath, content);
  io.stdout(`Created starter ${format} deck with ${starterCards.length} card(s): ${filePath}`);
  return 0;
}

function runCompare(positionals, flags, io) {
  if (positionals.length < 2) {
    throw new RangeError("'compare' requires at least one rating argument (e.g. compare good,good,again,good)");
  }
  const rawTokens = positionals.slice(1).flatMap((part) => part.split(',')).map((s) => s.trim()).filter(Boolean);
  if (rawTokens.length === 0) {
    throw new RangeError("'compare' requires at least one rating");
  }
  const strategies = flags.strategies
    ? flags.strategies.split(',').map((s) => s.trim()).filter(Boolean)
    : STRATEGY_IDS;
  const comparison = compareStrategies(rawTokens, {
    startAt: flags.at ?? new Date(),
    strategies
  });
  io.stdout(flags.json ? JSON.stringify(comparison, null, 2) : formatComparisonText(comparison));
  return 0;
}

function buildPlanOptions(flags) {
  const options = {};
  if (flags.limit != null) options.limit = parseNonNegativeInt(flags.limit, 'limit');
  if (flags['topic-limit'] != null) options.maxPerTopic = parseNonNegativeInt(flags['topic-limit'], 'topic-limit');
  if (flags['new-limit'] != null) options.maxNewCards = parseNonNegativeInt(flags['new-limit'], 'new-limit');
  return options;
}

async function resolveSessionPrompter(io) {
  if (typeof io.prompt === 'function') {
    return { prompt: io.prompt, close() {} };
  }
  return await io.createPrompter();
}

async function askMistakeReason(prompter, io) {
  const reasonMap = new Map();
  MISTAKE_REASONS.forEach((reason, idx) => {
    reasonMap.set(String(idx + 1), reason);
    reasonMap.set(reason, reason);
  });
  const menu = MISTAKE_REASONS.map((r, i) => `[${i + 1}] ${r}`).join('  ');
  const raw = await prompter.prompt(`Optional mistake reason ${menu} (Enter to skip): `);
  if (raw == null) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return undefined;
  if (reasonMap.has(normalized)) return reasonMap.get(normalized);
  io.stdout('Unknown reason ignored; saved as unspecified lapse.');
  return undefined;
}

async function runStudy(cards, filePath, format, at, flags, io) {
  const strategyId = flags.strategy ?? 'balanced';
  getReviewStrategy(strategyId);
  if (flags.save && !flags.out && format === 'md') {
    throw new RangeError('cannot overwrite Markdown with scheduling metadata; pass --out deck.json or deck.csv');
  }
  const saveTarget = flags.out ?? (flags.save ? filePath : null);
  const saveFormat = saveTarget ? inferFormat(saveTarget, saveTarget === filePath ? format : undefined) : null;
  if (saveTarget && saveFormat === 'md') {
    throw new RangeError('--out for study session progress must be .json or .csv');
  }

  const plan = planStudySession(cards, at, buildPlanOptions(flags));
  if (plan.plannedCount === 0) {
    io.stdout('No cards are due right now.');
    return 0;
  }

  io.stdout(`Starting offline study session (${plan.plannedCount} card(s), strategy=${strategyId}):`);
  let workingDeck = [...cards];
  let reviewedCount = 0;
  let skippedCount = 0;
  const prompter = await resolveSessionPrompter(io);

  try {
    for (let i = 0; i < plan.planned.length; i += 1) {
      const plannedItem = plan.planned[i];
      const cardIndex = workingDeck.findIndex((c) => c.id === plannedItem.id);
      const card = workingDeck[cardIndex];
      io.stdout('');
      io.stdout(`[${i + 1}/${plan.planned.length}] Topic: ${card.topic} (${plannedItem.status})`);
      io.stdout(`Q: ${card.question}`);

      const preInput = await prompter.prompt('Press Enter to reveal answer, [s] skip, or [q] quit: ');
      const preCmd = (preInput ?? 'q').trim().toLowerCase();
      if (preCmd === 'q' || preCmd === 'quit') break;
      if (preCmd === 's' || preCmd === 'skip') {
        skippedCount += 1;
        io.stdout('Skipped (no review recorded).');
        continue;
      }

      io.stdout(`A: ${card.answer}`);
      let rating = null;
      let action = 'rate';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const rateInput = await prompter.prompt('Rate [1] again  [2] hard  [3] good  [4] easy  ([s] skip, [q] quit): ');
        const cmd = (rateInput ?? 'q').trim().toLowerCase();
        if (cmd === 'q' || cmd === 'quit') {
          action = 'quit';
          break;
        }
        if (cmd === 's' || cmd === 'skip') {
          action = 'skip';
          break;
        }
        if (RATING_CHOICES.has(cmd)) {
          rating = RATING_CHOICES.get(cmd);
          break;
        }
        io.stdout('Enter 1-4, again/hard/good/easy, s to skip, or q to quit.');
      }

      if (action === 'quit') break;
      if (action === 'skip' || !rating) {
        skippedCount += 1;
        io.stdout('Skipped (no review recorded).');
        continue;
      }

      const reason = rating === 'again' ? await askMistakeReason(prompter, io) : undefined;
      const reviewAt = flags.at ? at : new Date();
      const updated = reviewCardWithStrategy(card, rating, reviewAt, {
        strategy: strategyId,
        ...(reason ? { reason } : {})
      });
      workingDeck[cardIndex] = updated;
      reviewedCount += 1;
      io.stdout(`Recorded '${rating}' (box ${updated.box}, next due ${updated.dueAt}).`);
    }
  } finally {
    prompter.close();
  }

  io.stdout('');
  io.stdout(`Session finished: ${reviewedCount} reviewed, ${skippedCount} skipped.`);
  if (saveTarget && reviewedCount > 0) {
    await io.writeText(saveTarget, serializeDeck(workingDeck, saveFormat));
    io.stdout(`Saved updated progress (${workingDeck.length} card(s)) to ${saveTarget}`);
  } else if (reviewedCount > 0) {
    io.stdout('Progress not written to disk (pass --save or --out <file.json> to keep changes).');
  }
  return 0;
}

/** Execute one FARK CLI invocation and return a numeric exit code (0 or 1). */
export async function runCli(argv, ioOverrides = {}) {
  const io = { ...defaultIo(), ...ioOverrides };
  try {
    const { positionals, flags } = parseArgs(argv);
    const command = positionals[0];

    if (flags.version && !command) {
      io.stdout(CLI_VERSION);
      return 0;
    }
    if (flags.help || command === 'help') {
      io.stdout(HELP_TEXT);
      return 0;
    }
    if (!command) {
      io.stderr(HELP_TEXT);
      return 1;
    }
    const allowedFlags = COMMAND_FLAGS[command];
    if (!allowedFlags) {
      throw new RangeError(`unknown command: ${command}`);
    }
    for (const flag of Object.keys(flags)) {
      if (!allowedFlags.has(flag)) {
        throw new RangeError(`flag --${flag} is not supported for '${command}'`);
      }
    }

    if (command === 'init') {
      return await runInit(positionals, flags, io, {
        hasExists: typeof ioOverrides.exists === 'function',
        hasReadText: typeof ioOverrides.readText === 'function'
      });
    }
    if (command === 'compare') return runCompare(positionals, flags, io);

    if (positionals.length !== 2) {
      throw new RangeError(`'${command}' requires exactly one <file> argument`);
    }

    const filePath = positionals[1];
    const format = inferFormat(filePath, flags.format);
    const rawText = await io.readText(filePath);
    const cards = loadDeck(rawText, format);
    const at = flags.at ?? new Date();

    if (command === 'validate') {
      const topics = new Set(cards.map((card) => card.topic)).size;
      const result = { valid: true, format, cards: cards.length, topics };
      io.stdout(flags.json
        ? JSON.stringify(result, null, 2)
        : `Valid ${format} deck: ${cards.length} card(s) across ${topics} topic(s).`);
      return 0;
    }

    if (command === 'summary') {
      const summary = getStudySummary(cards, at);
      const topics = getTopicSummaries(cards, at);
      const mistakes = getMistakeBreakdown(cards);
      io.stdout(flags.json
        ? JSON.stringify({ summary, topics, mistakes }, null, 2)
        : formatSummaryText(summary, topics, mistakes));
      return 0;
    }

    if (command === 'plan') {
      const plan = planStudySession(cards, at, buildPlanOptions(flags));
      io.stdout(flags.json ? JSON.stringify(plan, null, 2) : formatPlanText(plan));
      return 0;
    }

    if (command === 'forecast') {
      const days = flags.days != null ? parseNonNegativeInt(flags.days, 'days') : 7;
      const forecast = getReviewForecast(cards, at, days);
      io.stdout(flags.json ? JSON.stringify(forecast, null, 2) : formatForecastText(forecast));
      return 0;
    }

    if (command === 'study') {
      return await runStudy(cards, filePath, format, at, flags, io);
    }

    if (command === 'convert') {
      if (flags.to !== 'json' && flags.to !== 'csv' && flags.to !== 'md') {
        throw new RangeError('convert requires --to json, csv, or md');
      }
      if (flags['escape-formulas'] && flags.to !== 'csv') {
        throw new RangeError('--escape-formulas applies only when --to csv');
      }
      if ((flags['include-stats'] || flags.collapsible) && flags.to !== 'md') {
        throw new RangeError('--include-stats and --collapsible apply only when --to md');
      }
      const output = serializeDeck(cards, flags.to, flags);
      if (flags.out) {
        await io.writeText(flags.out, output);
        io.stdout(`Converted ${cards.length} card(s) from ${format} to ${flags.to}: ${flags.out}`);
      } else {
        io.stdout(output);
      }
      return 0;
    }

    return 1;
  } catch (error) {
    io.stderr(`Error: ${error.message}`);
    return 1;
  }
}
