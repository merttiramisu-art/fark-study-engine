/**
 * Zero-dependency Model Context Protocol (MCP) stdio JSON-RPC 2.0 server.
 * Exposes FARK's deterministic study planner, analytics, strategy simulator,
 * and portable converters so AI assistants never hallucinate schedule math.
 */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import {
  getMistakeBreakdown,
  getReviewForecast,
  getStudySummary,
  getTopicSummaries
} from './index.js';
import { getStudyRecommendations, planStudySession } from './planner.js';
import { exportStudyDeck, importStudyDeck } from './portable.js';
import { exportStudyCsv, importStudyCsv } from './csv.js';
import { exportStudyMarkdown, importStudyMarkdown } from './markdown.js';
import { exportStudyTsv, importStudyTsv } from './interchange.js';
import { compareStrategies, simulateCohort } from './strategies.js';
import { createLedger, importLedger, recordLedgerReview } from './ledger.js';
import { diagnoseLearner, evaluateAllInterventions, evaluateIntervention, recordIntervention } from './diagnosis.js';

const PACKAGE_JSON = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const SERVER_VERSION = PACKAGE_JSON.version;
const PROTOCOL_VERSION = '2024-11-05';

export const MCP_TOOLS = Object.freeze([
  {
    name: 'fark_validate_deck',
    description: 'Validate JSON, CSV, TSV, or Markdown study deck content offline without fabricating mastery.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['deckText', 'format'],
      properties: {
        deckText: { type: 'string', description: 'Raw serialized deck text' },
        format: { type: 'string', enum: ['json', 'csv', 'tsv', 'md'] }
      }
    }
  },
  {
    name: 'fark_get_study_summary',
    description: 'Return exact card counts, topic breakdown, self-reported lapse stats (unspecified lapses remain unknown), and honest study recommendations.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['deckText', 'format'],
      properties: {
        deckText: { type: 'string' },
        format: { type: 'string', enum: ['json', 'csv', 'tsv', 'md'] },
        at: { type: 'string', description: 'Optional ISO-8601 reference timestamp' }
      }
    }
  },
  {
    name: 'fark_plan_session',
    description: 'Produce an explainable, bounded round-robin study plan across topics with explicit reason codes.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['deckText', 'format'],
      properties: {
        deckText: { type: 'string' },
        format: { type: 'string', enum: ['json', 'csv', 'tsv', 'md'] },
        at: { type: 'string' },
        limit: { type: 'integer', minimum: 0 },
        maxPerTopic: { type: 'integer', minimum: 0 },
        maxNewCards: { type: 'integer', minimum: 0 },
        reasonAware: { type: 'boolean' }
      }
    }
  },
  {
    name: 'fark_forecast_workload',
    description: 'Project already-scheduled due dates across 1–365 days; unreviewed cards remain explicitly separate.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['deckText', 'format'],
      properties: {
        deckText: { type: 'string' },
        format: { type: 'string', enum: ['json', 'csv', 'tsv', 'md'] },
        at: { type: 'string' },
        days: { type: 'integer', minimum: 1, maximum: 365 }
      }
    }
  },
  {
    name: 'fark_compare_strategies',
    description: 'Compare transparent spacing presets (balanced, gentle, intensive, sm2) over a rating sequence.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['steps'],
      properties: {
        steps: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', enum: ['again', 'hard', 'good', 'easy'] }
        },
        startAt: { type: 'string' },
        strategies: {
          type: 'array',
          items: { type: 'string', enum: ['balanced', 'gentle', 'intensive', 'sm2', 'dsr'] }
        }
      }
    }
  },
  {
    name: 'fark_simulate_cohort',
    description: 'Run a deterministic synthetic forgetting-curve cohort benchmark across transparent scheduling strategies.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cardsCount: { type: 'integer', minimum: 1, maximum: 500 },
        days: { type: 'integer', minimum: 1, maximum: 180 },
        dailyLimit: { type: 'integer', minimum: 1, maximum: 500 },
        profile: { type: 'string', enum: ['steady', 'cramming', 'missed-days'] },
        seed: { type: 'integer' }
      }
    }
  },
  {
    name: 'fark_convert_deck',
    description: 'Convert validated deck content between JSON, RFC 4180 CSV, Anki TSV, and Markdown study sheets.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['deckText', 'from', 'to'],
      properties: {
        deckText: { type: 'string' },
        from: { type: 'string', enum: ['json', 'csv', 'tsv', 'md'] },
        to: { type: 'string', enum: ['json', 'csv', 'tsv', 'md'] },
        escapeFormulas: { type: 'boolean' },
        includeStats: { type: 'boolean' },
        collapsibleAnswers: { type: 'boolean' }
      }
    }
  },
  {
    name: 'fark_diagnose_learner',
    description: 'Analyze a learning ledger (or portable deck + optional prerequisite graph) using DSR memory retrievability, recent recall trends, Brier calibration, and evidence-backed intervention recommendations.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ledgerText: { type: 'string', description: 'Serialized fark-study-ledger JSON' },
        deckText: { type: 'string', description: 'Optional serialized deck when no ledger exists yet' },
        format: { type: 'string', enum: ['json', 'csv', 'tsv', 'md'] },
        concepts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              prerequisites: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        at: { type: 'string' }
      }
    }
  },
  {
    name: 'fark_log_review_event',
    description: 'Append one immutable review event into a Learning Ledger and return updated DSR memory state and pre-review predictedR.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['ledgerText', 'cardId', 'rating'],
      properties: {
        ledgerText: { type: 'string' },
        cardId: { type: 'string' },
        rating: { type: 'string', enum: ['again', 'hard', 'good', 'easy'] },
        reason: { type: 'string', enum: ['knowledge-gap', 'misconception', 'attention', 'other'] },
        at: { type: 'string' }
      }
    }
  },
  {
    name: 'fark_record_intervention',
    description: 'Seal an educational intervention proposal into the ledger with a frozen baseline and matched control-topic baseline.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['ledgerText', 'targetTopic'],
      properties: {
        ledgerText: { type: 'string' },
        id: { type: 'string' },
        targetTopic: { type: 'string' },
        targetConcepts: { type: 'array', items: { type: 'string' } },
        signal: { type: 'string' },
        action: { type: 'string' },
        hypothesis: { type: 'string' },
        at: { type: 'string' }
      }
    }
  },
  {
    name: 'fark_evaluate_interventions',
    description: 'Measure post-intervention recall delta, misconception reduction, DSR stability gain, and net uplift vs non-target topics.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['ledgerText'],
      properties: {
        ledgerText: { type: 'string' },
        interventionId: { type: 'string' },
        minFollowUpReviews: { type: 'integer', minimum: 1 },
        at: { type: 'string' }
      }
    }
  }
]);

function parseDeckByFormat(deckText, format) {
  switch (format) {
    case 'json': return importStudyDeck(deckText);
    case 'csv': return importStudyCsv(deckText);
    case 'tsv': return importStudyTsv(deckText);
    case 'md': return importStudyMarkdown(deckText);
    default: throw new RangeError('unsupported deck format: ' + format);
  }
}

function serializeDeckByFormat(cards, format, args) {
  switch (format) {
    case 'json': return exportStudyDeck(cards);
    case 'csv': return exportStudyCsv(cards, { escapeFormulas: Boolean(args.escapeFormulas) });
    case 'tsv': return exportStudyTsv(cards);
    case 'md':
      return exportStudyMarkdown(cards, {
        includeStats: Boolean(args.includeStats),
        collapsibleAnswers: Boolean(args.collapsibleAnswers)
      });
    default: throw new RangeError('unsupported target format: ' + format);
  }
}

function callTool(name, args = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new TypeError('tool arguments must be an object');
  }
  const at = args.at ?? new Date();

  switch (name) {
    case 'fark_validate_deck': {
      const cards = parseDeckByFormat(args.deckText, args.format);
      const topics = new Set(cards.map((c) => c.topic)).size;
      return { valid: true, format: args.format, cards: cards.length, topics };
    }
    case 'fark_get_study_summary': {
      const cards = parseDeckByFormat(args.deckText, args.format);
      return {
        summary: getStudySummary(cards, at),
        topics: getTopicSummaries(cards, at),
        mistakes: getMistakeBreakdown(cards),
        recommendations: getStudyRecommendations(cards, at)
      };
    }
    case 'fark_plan_session': {
      const cards = parseDeckByFormat(args.deckText, args.format);
      const opts = {};
      if (args.limit !== undefined) opts.limit = args.limit;
      if (args.maxPerTopic !== undefined) opts.maxPerTopic = args.maxPerTopic;
      if (args.maxNewCards !== undefined) opts.maxNewCards = args.maxNewCards;
      if (args.reasonAware !== undefined) opts.reasonAware = args.reasonAware;
      return planStudySession(cards, at, opts);
    }
    case 'fark_forecast_workload': {
      const cards = parseDeckByFormat(args.deckText, args.format);
      return getReviewForecast(cards, at, args.days ?? 7);
    }
    case 'fark_compare_strategies':
      return compareStrategies(args.steps, {
        ...(args.startAt !== undefined ? { startAt: args.startAt } : {}),
        ...(args.strategies !== undefined ? { strategies: args.strategies } : {})
      });
    case 'fark_simulate_cohort':
      return simulateCohort(args);
    case 'fark_convert_deck': {
      const cards = parseDeckByFormat(args.deckText, args.from);
      return {
        from: args.from,
        to: args.to,
        cards: cards.length,
        output: serializeDeckByFormat(cards, args.to, args)
      };
    }
    case 'fark_diagnose_learner': {
      let ledger;
      if (args.ledgerText) {
        ledger = importLedger(args.ledgerText);
      } else if (args.deckText && args.format) {
        const cards = parseDeckByFormat(args.deckText, args.format);
        ledger = createLedger({ cards, concepts: args.concepts, createdAt: at });
      } else {
        throw new RangeError('fark_diagnose_learner requires ledgerText or (deckText + format)');
      }
      return diagnoseLearner(ledger, at);
    }
    case 'fark_log_review_event': {
      const ledger = importLedger(args.ledgerText);
      return recordLedgerReview(ledger, args.cardId, args.rating, at, {
        ...(args.reason !== undefined ? { reason: args.reason } : {})
      });
    }
    case 'fark_record_intervention': {
      const ledger = importLedger(args.ledgerText);
      return recordIntervention(ledger, {
        ...(args.id !== undefined ? { id: args.id } : {}),
        targetTopic: args.targetTopic,
        ...(args.targetConcepts !== undefined ? { targetConcepts: args.targetConcepts } : {}),
        ...(args.signal !== undefined ? { signal: args.signal } : {}),
        ...(args.action !== undefined ? { recommendedAction: args.action } : {}),
        ...(args.hypothesis !== undefined ? { hypothesis: args.hypothesis } : {})
      }, at);
    }
    case 'fark_evaluate_interventions': {
      const ledger = importLedger(args.ledgerText);
      const opts = args.minFollowUpReviews !== undefined ? { minFollowUpReviews: args.minFollowUpReviews } : {};
      if (args.interventionId) {
        return evaluateIntervention(ledger, args.interventionId, at, opts);
      }
      return {
        evaluations: evaluateAllInterventions(ledger, at, opts)
      };
    }
    default:
      throw new RangeError('unknown tool: ' + name);
  }
}

/** Process one JSON-RPC 2.0 MCP message and return a response object (or null for notifications). */
export function handleMcpRequest(message) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: message?.id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' }
    };
  }

  // JSON-RPC notifications have no id and expect no reply.
  if (message.id === undefined) {
    return null;
  }

  const { id, method, params = {} } = message;
  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'fark-study-engine', version: SERVER_VERSION }
          }
        };
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
      case 'tools/call': {
        const toolName = params?.name;
        if (typeof toolName !== 'string') {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'tools/call requires string params.name' }
          };
        }
        try {
          const data = callTool(toolName, params.arguments ?? {});
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
              isError: false
            }
          };
        } catch (toolError) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: toolError.message }],
              isError: true
            }
          };
        }
      }
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: 'Method not found: ' + method }
        };
    }
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err.message }
    };
  }
}

/** Run the newline-delimited JSON-RPC 2.0 MCP server over stdin/stdout streams. */
export async function startMcpServer({ input = process.stdin, output = process.stdout, errorOutput = process.stderr } = {}) {
  const rl = createInterface({ input, crlfDelay: Infinity });
  errorOutput.write(`FARK Study Engine MCP v${SERVER_VERSION} listening on stdio\n`);

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;
    let reply;
    try {
      const msg = JSON.parse(line);
      reply = handleMcpRequest(msg);
    } catch {
      reply = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON line' }
      };
    }
    if (reply !== null) {
      output.write(JSON.stringify(reply) + '\n');
    }
  }
}
