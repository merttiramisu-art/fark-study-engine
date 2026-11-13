/**
 * Portable offline deck format.
 * This is plain JSON, NOT encryption, cloud backup, or automatic persistence.
 */
import { validateDeck } from './index.js';

const FORMAT = 'fark-study-deck';
const SCHEMA_VERSION = 1;
const MAX_CARDS = 10_000;
const MAX_JSON_CHARS = 2_000_000;
const FIELDS = [
  'id', 'topic', 'question', 'answer', 'box', 'dueAt',
  'lastReviewedAt', 'reviews', 'correct', 'lapses', 'reasonCounts'
];
const FIELD_SET = new Set(FIELDS);

function checkSize(cards) {
  if (cards.length > MAX_CARDS) {
    throw new RangeError('deck exceeds the maximum of 10,000 cards');
  }
}

function cleanCard(card) {
  for (const field of Object.keys(card)) {
    if (!FIELD_SET.has(field)) {
      throw new RangeError('unknown card field: ' + field);
    }
  }
  const safe = {};
  for (const field of FIELDS) {
    if (Object.hasOwn(card, field)) {
      if (field === 'reasonCounts') {
        // Build a fresh record; do not trust the imported object's prototype.
        safe[field] = { ...card.reasonCounts };
      } else {
        safe[field] = card[field];
      }
    }
  }
  return safe;
}

/**
 * Return a versioned JSON string containing ONLY the documented FARK card fields.
 * Reject unknown fields instead of silently discarding user data.
 */
export function exportStudyDeck(cards) {
  validateDeck(cards);
  checkSize(cards);
  const serialized = JSON.stringify({
    format: FORMAT,
    schemaVersion: SCHEMA_VERSION,
    cards: cards.map(cleanCard)
  }, null, 2);
  if (serialized.length > MAX_JSON_CHARS) {
    throw new RangeError('deck JSON exceeds the maximum of 2,000,000 characters');
  }
  return serialized;
}

/**
 * Parse a versioned FARK deck, rejecting unknown versions or invalid cards.
 * No automatic disk access, network calls, or import into a user account.
 */
export function importStudyDeck(json) {
  if (typeof json !== 'string') throw new TypeError('deck JSON must be a string');
  if (json.length > MAX_JSON_CHARS) {
    throw new RangeError('deck JSON exceeds the maximum of 2,000,000 characters');
  }
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new SyntaxError('invalid deck JSON');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('deck payload must be an object');
  }
  if (Object.keys(data).sort().join(',') !== 'cards,format,schemaVersion') {
    throw new RangeError('unexpected deck payload fields');
  }
  if (data.format !== FORMAT || data.schemaVersion !== SCHEMA_VERSION) {
    throw new RangeError('unsupported deck format or schema version');
  }
  if (!Array.isArray(data.cards)) throw new TypeError('deck cards must be an array');
  checkSize(data.cards);
  validateDeck(data.cards);
  return data.cards.map(cleanCard);
}
