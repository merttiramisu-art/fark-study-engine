/**
 * Offline Markdown study-sheet exporter and Q&A parser.
 * Converts FARK decks to readable/printable Markdown and parses simple
 * Markdown notes (`## Topic`, `Q:` / `A:`, or `Q :: A`) back into unreviewed cards.
 */
import { createCard, validateDeck } from './index.js';
import { PORTABLE_LIMITS } from './portable.js';

const EXPORT_OPTION_KEYS = new Set(['title', 'includeStats', 'collapsibleAnswers']);
const IMPORT_OPTION_KEYS = new Set(['defaultTopic', 'idPrefix']);

function checkOptions(options, allowedKeys) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!allowedKeys.has(key)) {
      throw new RangeError('unknown markdown option: ' + key);
    }
  }
}

function cleanInlineText(text) {
  return String(text).replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatStatsLine(card) {
  const nonAgainPct = card.reviews === 0 ? 0 : Math.round((card.correct / card.reviews) * 100);
  if (card.reviews === 0) {
    return '  - _Self-reported status: unreviewed_';
  }
  return `  - _Self-reported history: box ${card.box} · ${card.reviews} reviews (${nonAgainPct}% non-again, ${card.lapses} lapses)_`;
}

/**
 * Export a validated deck as a structured Markdown study sheet grouped by topic.
 */
export function exportStudyMarkdown(cards, options = {}) {
  validateDeck(cards);
  if (cards.length > PORTABLE_LIMITS.maxCards) {
    throw new RangeError(`deck exceeds the maximum of ${PORTABLE_LIMITS.maxCards} cards`);
  }
  checkOptions(options, EXPORT_OPTION_KEYS);

  const title = options.title === undefined ? 'FARK Study Sheet' : cleanInlineText(options.title);
  if (!title) throw new RangeError('title must not be empty');
  const includeStats = Boolean(options.includeStats);
  const collapsibleAnswers = Boolean(options.collapsibleAnswers);

  const byTopic = new Map();
  for (const card of cards) {
    if (!byTopic.has(card.topic)) {
      byTopic.set(card.topic, []);
    }
    byTopic.get(card.topic).push(card);
  }

  const sortedTopics = [...byTopic.keys()].sort((a, b) => a.localeCompare(b));
  const lines = [
    `# ${title}`,
    '',
    `> Exported for offline reading and study sharing (${cards.length} cards across ${sortedTopics.length} topics). Self-reported review counts are optional context, not measured mastery.`,
    ''
  ];

  for (const topic of sortedTopics) {
    lines.push(`## ${cleanInlineText(topic)}`, '');
    for (const card of byTopic.get(topic)) {
      const q = cleanInlineText(card.question);
      const a = cleanInlineText(card.answer);
      if (collapsibleAnswers) {
        lines.push(`- **Q:** ${q}`);
        lines.push(`  - <details><summary>Show answer</summary>${a}</details>`);
      } else {
        lines.push(`- **Q:** ${q}`);
        lines.push(`  - **A:** ${a}`);
      }
      if (includeStats) {
        lines.push(formatStatsLine(card));
      }
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function stripBulletPrefix(line) {
  return line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').trim();
}

function stripDetailsTags(text) {
  return text
    .replace(/<details>\s*<summary>.*?<\/summary>/i, '')
    .replace(/<\/details>/gi, '')
    .trim();
}

function matchPrefixedField(line, label) {
  const cleaned = stripBulletPrefix(line);
  const re = new RegExp(`^(?:\\*\\*${label}:\\*\\*|${label}:)\\s*(.+)$`, 'i');
  const match = cleaned.match(re);
  return match ? match[1].trim() : null;
}

function makeSlug(text) {
  const ascii = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  return ascii || 'card';
}

/**
 * Parse a Markdown study sheet (`## Topic`, `- **Q:**` / `- **A:**`, `Q:` / `A:`, or `Q :: A`)
 * into independent unreviewed FARK cards.
 */
export function importStudyMarkdown(markdownText, options = {}) {
  if (typeof markdownText !== 'string') {
    throw new TypeError('markdown must be a string');
  }
  if (markdownText.length > PORTABLE_LIMITS.maxChars) {
    throw new RangeError(`markdown input exceeds ${PORTABLE_LIMITS.maxChars} characters`);
  }
  checkOptions(options, IMPORT_OPTION_KEYS);

  const defaultTopic =
    options.defaultTopic === undefined ? 'General' : cleanInlineText(options.defaultTopic);
  if (!defaultTopic) throw new RangeError('defaultTopic must not be empty');
  const idPrefix = options.idPrefix === undefined ? 'md' : cleanInlineText(options.idPrefix);
  if (!idPrefix) throw new RangeError('idPrefix must not be empty');

  const lines = markdownText.split(/\r?\n/);
  const entries = [];
  let currentTopic = defaultTopic;
  let pendingQuestion = null;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith('>')) {
      continue;
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      if (pendingQuestion !== null) {
        throw new RangeError(`question without matching answer before heading on line ${i + 1}`);
      }
      const levelMatch = trimmed.match(/^(#{1,6})/);
      const headingText = headingMatch[1].trim();
      // Treat top-level H1 like "# FARK Study Sheet" as a document title when H2 topics follow.
      if (levelMatch[1].length >= 2 || entries.length === 0) {
        const lower = headingText.toLowerCase();
        if (!(levelMatch[1].length === 1 && lower.includes('study sheet'))) {
          currentTopic = headingText;
        }
      }
      continue;
    }

    const qText = matchPrefixedField(trimmed, '(?:Q|Question)');
    if (qText !== null) {
      if (pendingQuestion !== null) {
        throw new RangeError(`question without matching answer before line ${i + 1}`);
      }
      pendingQuestion = qText;
      continue;
    }

    const aRaw = stripDetailsTags(stripBulletPrefix(trimmed));
    const aText = matchPrefixedField(aRaw, '(?:A|Answer)');
    if (aText !== null) {
      if (pendingQuestion === null) {
        throw new RangeError(`answer without preceding question on line ${i + 1}`);
      }
      entries.push({ topic: currentTopic, question: pendingQuestion, answer: aText });
      pendingQuestion = null;
      continue;
    }

    // Handle <details><summary>...</summary>answer</details> lines right after a Q line.
    if (pendingQuestion !== null && /<details>/i.test(trimmed)) {
      const extracted = stripDetailsTags(stripBulletPrefix(trimmed));
      if (!extracted) {
        throw new RangeError(`empty collapsible answer on line ${i + 1}`);
      }
      entries.push({ topic: currentTopic, question: pendingQuestion, answer: extracted });
      pendingQuestion = null;
      continue;
    }

    // Handle single-line "Question :: Answer" notes (with optional markdown bullet prefix).
    const body = stripBulletPrefix(trimmed);
    const sepIndex = body.indexOf('::');
    if (sepIndex > 0) {
      if (pendingQuestion !== null) {
        throw new RangeError(`question without matching answer before line ${i + 1}`);
      }
      const question = body.slice(0, sepIndex).trim();
      const answer = body.slice(sepIndex + 2).trim();
      if (!question || !answer) {
        throw new RangeError(`invalid Q :: A entry on line ${i + 1}`);
      }
      entries.push({ topic: currentTopic, question, answer });
      continue;
    }
  }

  if (pendingQuestion !== null) {
    throw new RangeError('last question is missing an answer');
  }
  if (entries.length === 0) {
    throw new RangeError('no study cards found in markdown input');
  }
  if (entries.length > PORTABLE_LIMITS.maxCards) {
    throw new RangeError(`deck exceeds the maximum of ${PORTABLE_LIMITS.maxCards} cards`);
  }

  return entries.map((entry, index) =>
    createCard({
      id: `${idPrefix}-${index + 1}-${makeSlug(entry.question)}`,
      topic: entry.topic,
      question: entry.question,
      answer: entry.answer
    })
  );
}
