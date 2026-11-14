/**
 * Append-only, event-sourced Open Learning Ledger (`fark-study-ledger` v1).
 *
 * Replaces lossy mutable counters with immutable timestamped learning events
 * (reviews + recorded interventions + prerequisite concept graph) while staying
 * 100% backwards-compatible via `projectCardsFromLedger(ledger)`.
 */
import { createCard, MISTAKE_REASONS, reviewCard, validateDeck } from './index.js';
import { createMemoryState, updateDsrMemory } from './memory.js';
import { PORTABLE_LIMITS } from './portable.js';

export const LEDGER_FORMAT = 'fark-study-ledger';
export const LEDGER_VERSION = 1;

const MAX_EVENTS = 50_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const EVENT_TYPES = new Set(['review', 'intervention']);
const REASONS = new Set(MISTAKE_REASONS);

function parseIso(at, field = 'timestamp') {
  const date = at instanceof Date ? new Date(at.getTime()) : new Date(at);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(field + ' must be a valid date');
  }
  return date.toISOString();
}

function nonEmptyText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(field + ' must be a non-empty string');
  }
  return value.trim();
}

function boxToApproxStability(box) {
  const table = [0.25, 1.5, 4.0, 9.0, 18.0, 36.0, 72.0];
  return table[Math.min(table.length - 1, Math.max(0, box ?? 0))];
}

function normalizeConcepts(concepts, fallbackTopic) {
  if (concepts == null) return [fallbackTopic];
  if (!Array.isArray(concepts) || concepts.length === 0) {
    throw new RangeError('concepts must be a non-empty array of strings');
  }
  const seen = new Set();
  for (const item of concepts) {
    const clean = nonEmptyText(item, 'concept');
    seen.add(clean);
  }
  return [...seen];
}

function checkNoPrerequisiteCycle(conceptsMap) {
  const visiting = new Set();
  const visited = new Set();

  function dfs(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new RangeError('concept prerequisite cycle detected at: ' + id);
    }
    visiting.add(id);
    const node = conceptsMap[id];
    if (node) {
      for (const prereq of node.prerequisites) {
        dfs(prereq);
      }
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of Object.keys(conceptsMap)) {
    dfs(id);
  }
}

function cloneLedger(ledger) {
  return structuredClone(ledger);
}

/** Validate complete structural integrity of a serialized or in-memory ledger. */
export function validateLedger(ledger) {
  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) {
    throw new TypeError('ledger must be an object');
  }
  if (ledger.format !== LEDGER_FORMAT || ledger.version !== LEDGER_VERSION) {
    throw new RangeError('unsupported ledger format or version');
  }
  parseIso(ledger.createdAt, 'ledger.createdAt');

  if (!ledger.concepts || typeof ledger.concepts !== 'object' || Array.isArray(ledger.concepts)) {
    throw new TypeError('ledger.concepts must be an object');
  }
  for (const [id, node] of Object.entries(ledger.concepts)) {
    nonEmptyText(id, 'concept id');
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      throw new TypeError('concept node must be an object');
    }
    nonEmptyText(node.label, 'concept.label');
    if (!Array.isArray(node.prerequisites)) {
      throw new TypeError('concept.prerequisites must be an array');
    }
    for (const req of node.prerequisites) nonEmptyText(req, 'prerequisite');
  }
  checkNoPrerequisiteCycle(ledger.concepts);

  if (!ledger.cards || typeof ledger.cards !== 'object' || Array.isArray(ledger.cards)) {
    throw new TypeError('ledger.cards must be an object');
  }
  for (const [id, card] of Object.entries(ledger.cards)) {
    if (!card || typeof card !== 'object' || Array.isArray(card) || card.id !== id) {
      throw new RangeError('card entry mismatch at: ' + id);
    }
    nonEmptyText(card.topic, 'card.topic');
    nonEmptyText(card.question, 'card.question');
    nonEmptyText(card.answer, 'card.answer');
    normalizeConcepts(card.concepts, card.topic);
    if (card.importedSnapshot != null) {
      validateDeck([card.importedSnapshot]);
    }
  }

  if (!Array.isArray(ledger.events)) {
    throw new TypeError('ledger.events must be an array');
  }
  if (ledger.events.length > MAX_EVENTS) {
    throw new RangeError(`ledger exceeds maximum of ${MAX_EVENTS} events`);
  }

  const eventIds = new Set();
  for (const ev of ledger.events) {
    if (!ev || typeof ev !== 'object' || Array.isArray(ev)) {
      throw new TypeError('event must be an object');
    }
    nonEmptyText(ev.id, 'event.id');
    if (eventIds.has(ev.id)) {
      throw new RangeError('duplicate event id: ' + ev.id);
    }
    eventIds.add(ev.id);
    if (!EVENT_TYPES.has(ev.type)) {
      throw new RangeError('unknown ledger event type: ' + ev.type);
    }
    parseIso(ev.at, 'event.at');
    if (ev.type === 'review') {
      if (!Object.hasOwn(ledger.cards, ev.cardId)) {
        throw new RangeError('review event references unknown card: ' + ev.cardId);
      }
      if (ev.reason != null && !REASONS.has(ev.reason)) {
        throw new RangeError('unknown event mistake reason: ' + ev.reason);
      }
    }
  }
  return true;
}

/**
 * Create a new Learning Ledger, optionally seeded from an existing validated card deck
 * and a concept prerequisite graph (`[{ id, label, prerequisites }]`).
 * Existing card counters are preserved honestly in `importedSnapshot` without inventing fake event timestamps.
 */
export function createLedger(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const createdAt = parseIso(options.createdAt ?? new Date(), 'createdAt');
  const ledger = {
    format: LEDGER_FORMAT,
    version: LEDGER_VERSION,
    createdAt,
    concepts: {},
    cards: {},
    events: []
  };

  if (options.concepts) {
    if (!Array.isArray(options.concepts)) throw new TypeError('concepts must be an array');
    for (const entry of options.concepts) {
      const id = nonEmptyText(entry.id, 'concept.id');
      const prereqs = (entry.prerequisites ?? []).map((p) => nonEmptyText(p, 'prerequisite'));
      ledger.concepts[id] = {
        id,
        label: nonEmptyText(entry.label ?? id, 'concept.label'),
        prerequisites: [...new Set(prereqs)]
      };
    }
  }

  if (options.cards) {
    validateDeck(options.cards);
    for (const card of options.cards) {
      const concepts = [card.topic];
      if (!Object.hasOwn(ledger.concepts, card.topic)) {
        ledger.concepts[card.topic] = { id: card.topic, label: card.topic, prerequisites: [] };
      }
      ledger.cards[card.id] = {
        id: card.id,
        topic: card.topic,
        concepts,
        question: card.question,
        answer: card.answer,
        createdAt,
        importedSnapshot: card.reviews > 0 ? structuredClone(card) : null
      };
    }
  }

  checkNoPrerequisiteCycle(ledger.concepts);
  return ledger;
}

/** Link a concept to zero or more prerequisite concepts (acyclic DAG enforced). */
export function linkConceptPrerequisites(ledger, conceptId, prerequisites = [], label) {
  validateLedger(ledger);
  const id = nonEmptyText(conceptId, 'conceptId');
  if (!Array.isArray(prerequisites)) throw new TypeError('prerequisites must be an array');
  const next = cloneLedger(ledger);
  const cleanPrereqs = [...new Set(prerequisites.map((p) => nonEmptyText(p, 'prerequisite')))];
  for (const p of cleanPrereqs) {
    if (!Object.hasOwn(next.concepts, p)) {
      next.concepts[p] = { id: p, label: p, prerequisites: [] };
    }
  }
  next.concepts[id] = {
    id,
    label: nonEmptyText(label ?? next.concepts[id]?.label ?? id, 'label'),
    prerequisites: cleanPrereqs
  };
  checkNoPrerequisiteCycle(next.concepts);
  return next;
}

/** Add a new card or update card prompts/concepts in an immutable ledger without dropping event history. */
export function upsertLedgerCard(ledger, cardInput, options = {}) {
  validateLedger(ledger);
  const card = cardInput.reviews !== undefined ? cardInput : createCard(cardInput);
  validateDeck([card]);
  const concepts = normalizeConcepts(options.concepts, card.topic);
  const createdAt = parseIso(options.at ?? ledger.createdAt, 'at');

  const next = cloneLedger(ledger);
  for (const concept of concepts) {
    if (!Object.hasOwn(next.concepts, concept)) {
      next.concepts[concept] = { id: concept, label: concept, prerequisites: [] };
    }
  }
  const existing = next.cards[card.id];
  next.cards[card.id] = {
    id: card.id,
    topic: card.topic,
    concepts,
    question: card.question,
    answer: card.answer,
    createdAt: existing?.createdAt ?? createdAt,
    importedSnapshot: existing ? existing.importedSnapshot : (card.reviews > 0 ? structuredClone(card) : null)
  };
  return next;
}

/** Derive current DSR memory state for one card by replaying its imported baseline + immutable review events. */
export function getCardMemoryState(ledger, cardId) {
  validateLedger(ledger);
  if (!Object.hasOwn(ledger.cards, cardId)) {
    throw new RangeError('unknown ledger card: ' + cardId);
  }
  const card = ledger.cards[cardId];
  let mem = createMemoryState();
  if (card.importedSnapshot && card.importedSnapshot.reviews > 0) {
    const snap = card.importedSnapshot;
    mem = {
      stabilityDays: boxToApproxStability(snap.box),
      difficulty: Math.min(9.5, Math.max(2.5, 4.8 + snap.lapses * 0.45 - Math.max(0, snap.box - 2) * 0.25)),
      lastReviewedAt: snap.lastReviewedAt,
      dueAt: snap.dueAt,
      reps: snap.reviews,
      lapses: snap.lapses
    };
  }
  const cardEvents = ledger.events.filter((e) => e.type === 'review' && e.cardId === cardId);
  if (cardEvents.length > 0) {
    return structuredClone(cardEvents[cardEvents.length - 1].memoryAfter);
  }
  return mem;
}

/**
 * Append one immutable study review event, recording pre-review predictedR for calibration
 * and post-review DSR state (`dueAt`, `stabilityDays`, `difficulty`).
 */
export function recordLedgerReview(ledger, cardId, rating, at = new Date(), options = {}) {
  validateLedger(ledger);
  if (!Object.hasOwn(ledger.cards, cardId)) {
    throw new RangeError('unknown ledger card: ' + cardId);
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const atIso = parseIso(at, 'at');
  const prevMemory = getCardMemoryState(ledger, cardId);
  const dsrOpts = {};
  if (options.reason !== undefined) dsrOpts.reason = options.reason;
  if (options.targetRetention !== undefined) dsrOpts.targetRetention = options.targetRetention;
  if (options.params !== undefined) dsrOpts.params = options.params;

  const updated = updateDsrMemory(prevMemory, rating, atIso, dsrOpts);
  const card = ledger.cards[cardId];

  const event = {
    id: options.eventId ?? `rev-${ledger.events.length + 1}-${cardId}`,
    type: 'review',
    at: atIso,
    cardId,
    topic: card.topic,
    concepts: [...card.concepts],
    rating,
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
    elapsedDays: updated.elapsedDays,
    predictedR: updated.predictedR,
    intervalDays: updated.intervalDays,
    memoryAfter: updated.state
  };

  const next = cloneLedger(ledger);
  next.events.push(event);
  return {
    ledger: next,
    event,
    memory: updated.state
  };
}

/**
 * Project standard v0.1–v0.5 `StudyCard[]` objects from the event ledger so every
 * existing planner, exporter, CLI command, and UI view works seamlessly.
 */
export function projectCardsFromLedger(ledger, at = new Date()) {
  validateLedger(ledger);
  parseIso(at, 'at');
  const projected = [];

  for (const entry of Object.values(ledger.cards)) {
    let card = entry.importedSnapshot
      ? structuredClone(entry.importedSnapshot)
      : createCard({
          id: entry.id,
          topic: entry.topic,
          question: entry.question,
          answer: entry.answer
        });

    const cardEvents = ledger.events.filter((e) => e.type === 'review' && e.cardId === entry.id);
    for (const ev of cardEvents) {
      const reviewOpts = ev.reason !== undefined ? { reason: ev.reason } : {};
      card = reviewCard(card, ev.rating, ev.at, reviewOpts);
      card = { ...card, dueAt: ev.memoryAfter.dueAt };
    }
    projected.push(card);
  }

  validateDeck(projected);
  return projected;
}

/** Serialize an entire learning ledger (cards, concept DAG, events, interventions) to JSON. */
export function exportLedger(ledger) {
  validateLedger(ledger);
  const out = JSON.stringify(ledger, null, 2);
  if (out.length > PORTABLE_LIMITS.maxChars * 4) {
    throw new RangeError('ledger JSON exceeds maximum portable size');
  }
  return out;
}

/** Parse and strictly validate a serialized Learning Ledger JSON string. */
export function importLedger(jsonText) {
  if (typeof jsonText !== 'string') {
    throw new TypeError('ledger JSON must be a string');
  }
  if (jsonText.length > PORTABLE_LIMITS.maxChars * 4) {
    throw new RangeError('ledger JSON exceeds maximum portable size');
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new SyntaxError('invalid ledger JSON');
  }
  validateLedger(parsed);
  return parsed;
}
