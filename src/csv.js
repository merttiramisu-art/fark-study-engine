/**
 * Portable RFC 4180 CSV import/export for FARK card content.
 * Preserves id, topic, question and answer; use portable JSON for full review history.
 */
import { createCard, validateDeck } from './index.js';
import { PORTABLE_LIMITS } from './portable.js';

const CSV_COLUMNS = Object.freeze(['id', 'topic', 'question', 'answer']);
const ALLOWED_COLUMNS = new Set(CSV_COLUMNS);
const REQUIRED_COLUMNS = Object.freeze(['topic', 'question', 'answer']);
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function checkOptions(options, allowedKeys) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!allowedKeys.has(key)) throw new RangeError('unknown CSV option: ' + key);
  }
}

function escapeCsvCell(value, escapeFormulas) {
  let text = String(value);
  if (escapeFormulas && FORMULA_PREFIX.test(text)) {
    text = "'" + text;
  }
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function parseCsvRecords(input) {
  const text = input.startsWith('\uFEFF') ? input.slice(1) : input;
  if (!text.trim()) throw new RangeError('CSV deck is empty');

  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let sawQuote = false;
  let justClosedQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
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
        sawQuote = false;
        justClosedQuote = false;
        continue;
      }
      if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && next === '\n') i++;
        row.push(field);
        records.push(row);
        row = [];
        field = '';
        sawQuote = false;
        justClosedQuote = false;
        continue;
      }
      throw new SyntaxError('unexpected character after closing quote');
    }

    if (ch === '"') {
      if (field.length > 0 || sawQuote) {
        throw new SyntaxError('unexpected quote inside unquoted CSV field');
      }
      inQuotes = true;
      sawQuote = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      sawQuote = false;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && next === '\n') i++;
      row.push(field);
      records.push(row);
      row = [];
      field = '';
      sawQuote = false;
      continue;
    }

    field += ch;
  }

  if (inQuotes) throw new SyntaxError('unterminated quoted CSV field');
  if (field.length > 0 || row.length > 0 || sawQuote) {
    row.push(field);
    records.push(row);
  }
  return records;
}

/**
 * Serialize a validated deck's card content (`id,topic,question,answer`) to RFC 4180 CSV.
 * Set `options.escapeFormulas = true` when exporting directly for spreadsheet software.
 */
export function exportStudyCsv(cards, options = {}) {
  validateDeck(cards);
  if (cards.length > PORTABLE_LIMITS.maxCards) {
    throw new RangeError('deck exceeds the maximum of 10,000 cards');
  }
  checkOptions(options, new Set(['escapeFormulas']));
  const escapeFormulas = options.escapeFormulas ?? false;
  if (typeof escapeFormulas !== 'boolean') {
    throw new TypeError('escapeFormulas must be a boolean');
  }

  const lines = [CSV_COLUMNS.join(',')];
  for (const card of cards) {
    lines.push(
      CSV_COLUMNS.map(column => escapeCsvCell(card[column], escapeFormulas)).join(',')
    );
  }
  const output = lines.join('\n');
  if (output.length > PORTABLE_LIMITS.maxChars) {
    throw new RangeError('deck CSV exceeds the maximum of 2,000,000 characters');
  }
  return output;
}

/**
 * Parse RFC 4180 CSV (`topic,question,answer` with optional `id`) into new unreviewed cards.
 * Rejects unknown columns, mismatched row widths, and duplicate IDs.
 */
export function importStudyCsv(csvText, options = {}) {
  if (typeof csvText !== 'string') throw new TypeError('deck CSV must be a string');
  if (csvText.length > PORTABLE_LIMITS.maxChars) {
    throw new RangeError('deck CSV exceeds the maximum of 2,000,000 characters');
  }
  checkOptions(options, new Set(['idPrefix']));
  const rawPrefix = options.idPrefix ?? 'card';
  if (typeof rawPrefix !== 'string' || !rawPrefix.trim()) {
    throw new TypeError('idPrefix must be a non-empty string');
  }
  const idPrefix = rawPrefix.trim();

  const records = parseCsvRecords(csvText);
  const rawHeader = records[0];
  const headers = rawHeader.map(name => name.trim());
  const columnIndex = new Map();
  for (let i = 0; i < headers.length; i++) {
    const name = headers[i];
    if (!name) throw new RangeError('CSV header column cannot be empty');
    if (!ALLOWED_COLUMNS.has(name)) throw new RangeError('unknown CSV column: ' + name);
    if (columnIndex.has(name)) throw new RangeError('duplicate CSV column: ' + name);
    columnIndex.set(name, i);
  }
  for (const required of REQUIRED_COLUMNS) {
    if (!columnIndex.has(required)) {
      throw new RangeError('CSV header missing required column: ' + required);
    }
  }

  const dataRows = records.slice(1);
  if (dataRows.length > PORTABLE_LIMITS.maxCards) {
    throw new RangeError('deck exceeds the maximum of 10,000 cards');
  }

  const hasIdColumn = columnIndex.has('id');
  const cards = dataRows.map((row, index) => {
    if (row.length !== headers.length) {
      throw new RangeError(`CSV row ${index + 2} expected ${headers.length} columns, got ${row.length}`);
    }
    const id = hasIdColumn
      ? row[columnIndex.get('id')]
      : `${idPrefix}-${String(index + 1).padStart(4, '0')}`;
    return createCard({
      id,
      topic: row[columnIndex.get('topic')],
      question: row[columnIndex.get('question')],
      answer: row[columnIndex.get('answer')]
    });
  });

  validateDeck(cards);
  return cards;
}
