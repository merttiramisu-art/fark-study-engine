/**
 * FARK Knowledge Core adapter v1.
 * General-purpose, content-agnostic bridge: no private curricula or copyrighted questions.
 * Never infers mastery or invents answers. Does not mutate the source or learning ledger.
 */
import { validateLedger } from './ledger.js';

function nonempty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be nonempty text');
  return value.trim();
}
function uniqueIds(values, name) {
  if (!Array.isArray(values)) throw new TypeError(name + ' must be an array');
  const ids = values.map((v) => nonempty(v, name));
  if (new Set(ids).size !== ids.length) throw new RangeError('duplicate ' + name);
  return ids;
}
function recordMap(rows, kind) {
  if (!Array.isArray(rows)) throw new TypeError(kind + ' must be an array');
  const map = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError('invalid ' + kind + ' entry');
    const id = nonempty(row.id, kind + '.id');
    if (map.has(id)) throw new RangeError('duplicate ' + kind + ' id: ' + id);
    map.set(id, row);
  }
  return map;
}
/**
 * Portable content index, intentionally separate from student events.
 * units: {id,label,prerequisiteIds?:[]}
 * outcomes: {id,unitId,label,prerequisiteIds?:[]}
 * resources: {id,outcomeIds:[],kind,revision}
 * questions: {id,outcomeIds:[],resourceId?,revision}
 * mappings: {cardId,questionId}
 */
export function validateKnowledgeCore(core) {
  if (!core || typeof core !== 'object' || Array.isArray(core)) throw new TypeError('core must be an object');
  if (core.format !== 'fark-knowledge-core' || core.version !== 1) throw new RangeError('unsupported knowledge core version');
  const units = recordMap(core.units, 'units');
  const outcomes = recordMap(core.outcomes, 'outcomes');
  const resources = recordMap(core.resources, 'resources');
  const questions = recordMap(core.questions, 'questions');
  if (!Array.isArray(core.mappings)) throw new TypeError('mappings must be an array');
  const mappings = core.mappings;
  const checkLinks = (ids, available, name) => {
    for (const id of ids) if (!available.has(id)) throw new RangeError('unknown ' + name + ': ' + id);
  };
  for (const unit of units.values()) {
    nonempty(unit.label, 'unit.label');
    checkLinks(uniqueIds(unit.prerequisiteIds ?? [], 'unit.prerequisiteIds'), units, 'unit prerequisite');
  }
  for (const outcome of outcomes.values()) {
    nonempty(outcome.label, 'outcome.label');
    if (!units.has(nonempty(outcome.unitId, 'outcome.unitId'))) throw new RangeError('unknown outcome unit');
    checkLinks(uniqueIds(outcome.prerequisiteIds ?? [], 'outcome.prerequisiteIds'), outcomes, 'outcome prerequisite');
  }
  const graph = new Map([...outcomes].map(([id, x]) => [id, x.prerequisiteIds ?? []]));
  const visiting = new Set(), visited = new Set();
  function walk(id) {
    if (visiting.has(id)) throw new RangeError('cyclic outcome prerequisites: ' + id);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const req of graph.get(id)) walk(req);
    visiting.delete(id); visited.add(id);
  }
  for (const id of graph.keys()) walk(id);
  for (const resource of resources.values()) {
    nonempty(resource.kind, 'resource.kind');
    nonempty(resource.revision, 'resource.revision');
    if (resource.misconceptionIds != null) uniqueIds(resource.misconceptionIds, 'resource.misconceptionIds');
    checkLinks(uniqueIds(resource.outcomeIds, 'resource.outcomeIds'), outcomes, 'resource outcome');
  }
  for (const question of questions.values()) {
    nonempty(question.revision, 'question.revision');
    checkLinks(uniqueIds(question.outcomeIds, 'question.outcomeIds'), outcomes, 'question outcome');
    if (question.resourceId != null && !resources.has(question.resourceId)) throw new RangeError('unknown question resource');
  }
  const seenCards = new Set();
  for (const mapping of mappings) {
    const cardId = nonempty(mapping.cardId, 'mapping.cardId');
    if (seenCards.has(cardId)) throw new RangeError('duplicate mapped card: ' + cardId);
    seenCards.add(cardId);
    if (!questions.has(nonempty(mapping.questionId, 'mapping.questionId'))) throw new RangeError('unknown mapped question');
  }
  return core;
}

/** Read-only join; no guessed outcome attribution and no synthetic mastery percentage. */
export function connectKnowledgeCore(core, ledger) {
  validateKnowledgeCore(core);
  validateLedger(ledger);
  const questions = new Map(core.questions.map((x) => [x.id, x]));
  const outcomes = new Map(core.outcomes.map((x) => [x.id, x]));
  const mappings = new Map(core.mappings.map((x) => [x.cardId, x.questionId]));
  const byOutcome = new Map(core.outcomes.map((x) => [x.id, { outcomeId:x.id, label:x.label, cardIds:[], reviews:0, again:0, selfReportedRecall:0, reasonCounts:{} }]));
  const unmappedCards = [];
  for (const cardId of Object.keys(ledger.cards)) {
    const question = questions.get(mappings.get(cardId));
    if (!question) { unmappedCards.push(cardId); continue; }
    for (const id of question.outcomeIds) byOutcome.get(id).cardIds.push(cardId);
  }
  for (const event of ledger.events) {
    if (event.type !== 'review') continue;
    const question = questions.get(mappings.get(event.cardId));
    if (!question) continue;
    for (const id of question.outcomeIds) {
      const row = byOutcome.get(id);
      row.reviews++;
      if (event.rating === 'again') row.again++;
      else row.selfReportedRecall++;
      if (event.reason) row.reasonCounts[event.reason] = (row.reasonCounts[event.reason] ?? 0) + 1;
    }
  }
  return {
    outcomes: [...byOutcome.values()].map((row) => ({
      ...row,
      cardIds: [...row.cardIds],
      evidence: row.reviews === 0 ? 'no-review-evidence' : 'self-reported-review-history',
      // Multiple outcomes on one question share evidence; do not treat as independent proof.
      mastery: null
    })),
    unmappedCards,
    mappingCoverage: { mapped: Object.keys(ledger.cards).length - unmappedCards.length, total: Object.keys(ledger.cards).length },
    disclaimer: 'Self-reported ratings are observations, not verified exam performance or mastery.'
  };
}

/** Identify which teaching resources are associated with observed review difficulties. */
export function suggestRemediation(core, connected, { minAgain = 1 } = {}) {
  validateKnowledgeCore(core);
  if (!Number.isSafeInteger(minAgain) || minAgain < 1) throw new RangeError('minAgain must be positive integer');
  if (!connected || !Array.isArray(connected.outcomes)) throw new TypeError('connected report required');
  const resources = core.resources;
  return connected.outcomes
    .filter((o) => o.again >= minAgain && o.reviews > 0)
    .map((o) => ({
      outcomeId: o.outcomeId,
      observedAgain: o.again,
      reviews: o.reviews,
      resourceIds: resources.filter((r) => r.outcomeIds.includes(o.outcomeId)).map((r) => r.id),
      rationale: 'Self-reported Again ratings; resource association is editorial, not an effectiveness claim.'
    }));
}
