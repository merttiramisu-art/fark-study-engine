/**
 * Zero-dependency CLI for validating, summarizing, planning, forecasting, and converting FARK decks.
 */
import { readFileSync } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  getMistakeBreakdown,
  getReviewForecast,
  getStudySummary,
  getTopicSummaries
} from './index.js';
import { planStudySession } from './planner.js';
import { exportStudyDeck, importStudyDeck, PORTABLE_LIMITS } from './portable.js';
import { exportStudyCsv, importStudyCsv } from './csv.js';

const PACKAGE_JSON = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
export const CLI_VERSION = PACKAGE_JSON.version;

const HELP_TEXT = `FARK Study Engine CLI v${CLI_VERSION}

Usage:
  fark validate <file> [--format json|csv] [--json]
  fark summary  <file> [--format json|csv] [--at <iso>] [--json]
  fark plan     <file> [--format json|csv] [--at <iso>] [--limit N] [--topic-limit N] [--new-limit N] [--json]
  fark forecast <file> [--format json|csv] [--at <iso>] [--days N] [--json]
  fark convert  <file> --to <json|csv> [--format json|csv] [--out <file>] [--escape-formulas]
  fark --help | --version`;

const VALUE_FLAGS = new Set(['format', 'at', 'limit', 'topic-limit', 'new-limit', 'days', 'to', 'out']);
const BOOL_FLAGS = new Set(['json', 'escape-formulas', 'help', 'version']);
const COMMAND_FLAGS = {
  validate: new Set(['format', 'json']),
  summary: new Set(['format', 'at', 'json']),
  plan: new Set(['format', 'at', 'limit', 'topic-limit', 'new-limit', 'json']),
  forecast: new Set(['format', 'at', 'days', 'json']),
  convert: new Set(['format', 'to', 'out', 'escape-formulas'])
};

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
    if (explicitFormat !== 'json' && explicitFormat !== 'csv') {
      throw new RangeError('--format must be json or csv');
    }
    return explicitFormat;
  }
  const ext = extname(filePath).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.csv') return 'csv';
  throw new RangeError('cannot infer deck format from extension; pass --format json or --format csv');
}

function loadDeck(text, format) {
  return format === 'csv' ? importStudyCsv(text) : importStudyDeck(text);
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
    stdout(text) {
      process.stdout.write(text + '\n');
    },
    stderr(text) {
      process.stderr.write(text + '\n');
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
    if (positionals.length !== 2) {
      throw new RangeError(`'${command}' requires exactly one <file> argument`);
    }

    const filePath = positionals[1];
    const format = inferFormat(filePath, flags.format);
    const rawText = await io.readText(filePath);
    const cards = loadDeck(rawText, format);
    const at = flags.at ?? new Date();

    if (command === 'validate') {
      const topics = new Set(cards.map(card => card.topic)).size;
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
      const options = {};
      if (flags.limit != null) options.limit = parseNonNegativeInt(flags.limit, 'limit');
      if (flags['topic-limit'] != null) options.maxPerTopic = parseNonNegativeInt(flags['topic-limit'], 'topic-limit');
      if (flags['new-limit'] != null) options.maxNewCards = parseNonNegativeInt(flags['new-limit'], 'new-limit');
      const plan = planStudySession(cards, at, options);
      io.stdout(flags.json ? JSON.stringify(plan, null, 2) : formatPlanText(plan));
      return 0;
    }

    if (command === 'forecast') {
      const days = flags.days != null ? parseNonNegativeInt(flags.days, 'days') : 7;
      const forecast = getReviewForecast(cards, at, days);
      io.stdout(flags.json ? JSON.stringify(forecast, null, 2) : formatForecastText(forecast));
      return 0;
    }

    if (command === 'convert') {
      if (flags.to !== 'json' && flags.to !== 'csv') {
        throw new RangeError('convert requires --to json or --to csv');
      }
      if (flags['escape-formulas'] && flags.to !== 'csv') {
        throw new RangeError('--escape-formulas applies only when --to csv');
      }
      const output = flags.to === 'csv'
        ? exportStudyCsv(cards, { escapeFormulas: !!flags['escape-formulas'] })
        : exportStudyDeck(cards);
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
