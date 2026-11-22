/**
 * A versioned, dependency-free boundary for independently authored educational content.
 * This is NOT a Kolibri/H5P/QTI parser. No external data is fetched or executed.
 * Supplied rights/provenance metadata is descriptive and cannot verify copyright.
 */
import { validateKnowledgeCore } from './knowledge-core.js';
import { compareFractionModels } from './visual-math.js';
import { buildNumberLineModel, buildTimelineModel } from './visual-learning.js';

export const OPEN_CONTENT_PACK_LIMITS = Object.freeze({
  maxBytes: 1_048_576,
  maxUnits: 200,
  maxOutcomes: 1000,
  maxLessons: 2000,
  maxQuestions: 2000,
  maxMappings: 3000
});
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function text(value, name, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(name + ' must be nonempty text of at most ' + max + ' characters');
  }
  return value.trim();
}
function identifier(value, name) {
  const result = text(value, name, 80);
  if (!IDENTIFIER.test(result) || result !== value) {
    throw new RangeError(name + ' must use a canonical ASCII identifier');
  }
  return result;
}
function rows(value, name, max, min = 0) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new RangeError(name + ' must have ' + min + ' to ' + max + ' entries');
  }
  return value;
}
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name + ' must be an object');
  }
  return value;
}
function ids(value, name, min = 0) {
  const result = rows(value, name, OPEN_CONTENT_PACK_LIMITS.maxOutcomes, min)
    .map((item, index) => identifier(item, name + '[' + index + ']'));
  if (new Set(result).size !== result.length) throw new RangeError('duplicate ' + name);
  return result;
}
function distinctEntries(items, name) {
  const keys = new Set();
  for (const entry of items) {
    if (keys.has(entry.id)) throw new RangeError('duplicate ' + name + ' id: ' + entry.id);
    keys.add(entry.id);
  }
  return items;
}
function decode(input) {
  let serialized;
  if (typeof input === 'string') {
    serialized = input;
  } else {
    try {
      serialized = JSON.stringify(input);
    } catch {
      throw new TypeError('content pack must be JSON serializable');
    }
  }
  if (typeof serialized !== 'string' || serialized.length > OPEN_CONTENT_PACK_LIMITS.maxBytes ||
      new TextEncoder().encode(serialized).length > OPEN_CONTENT_PACK_LIMITS.maxBytes) {
    throw new RangeError('content pack exceeds 1 MiB or is not serializable');
  }
  try {
    return object(JSON.parse(serialized), 'content pack');
  } catch (error) {
    if (error instanceof SyntaxError) throw new SyntaxError('invalid content pack JSON');
    throw error;
  }
}

/**
 * Optional declarative lesson visual. Fail closed on unknown props rather than
 * silently dropping a future or unsafe visualization instruction. The model
 * accepts only small, exact, nonnegative integer fractions.
 */
function lessonVisual(input) {
  if (input === undefined) return undefined;
  const visual = object(input, 'lesson.visual');
  if (visual.kind === 'number-line') {
    if (Object.keys(visual).some(key => !['kind','min','max','points'].includes(key))) {
      throw new RangeError('unsupported number-line visual field');
    }
    const model = buildNumberLineModel({min: visual.min, max: visual.max, points: visual.points});
    return {kind: 'number-line', min: model.min, max: model.max, points: model.points};
  }
  if (visual.kind === 'timeline') {
    if (Object.keys(visual).some(key => !['kind','events'].includes(key))) {
      throw new RangeError('unsupported timeline visual field');
    }
    const model = buildTimelineModel({events: visual.events});
    return {kind: 'timeline', events: model.events};
  }
  if (visual.kind !== 'fraction-comparison' ||
      Object.keys(visual).some(key => !['kind', 'left', 'right'].includes(key))) {
    throw new RangeError('unsupported lesson.visual kind or field');
  }
  function fraction(value, name) {
    const item = object(value, name);
    if (Object.keys(item).some(key => !['numerator','denominator'].includes(key))) {
      throw new RangeError('unsupported ' + name + ' field');
    }
    return { numerator: item.numerator, denominator: item.denominator };
  }
  const left = fraction(visual.left, 'lesson.visual.left');
  const right = fraction(visual.right, 'lesson.visual.right');
  compareFractionModels(left, right);
  return { kind: 'fraction-comparison', left, right };
}
/**
 * Convert a human-authored plain JSON content pack to FARK's existing Knowledge Core
 * and separate read-only presentation data. Never execute or render supplied HTML.
 * Callers must display lesson/question text via safe text APIs such as textContent.
 */
export function importOpenContentPack(input) {
  const pack = decode(input);
  if (pack.format !== 'fark-open-content-pack' || pack.version !== 1) {
    throw new RangeError('unsupported content pack format or version');
  }
  const origin = object(pack.attribution, 'attribution');
  const attribution = {
    title: text(origin.title, 'attribution.title'),
    creator: text(origin.creator, 'attribution.creator'),
    license: text(origin.license, 'attribution.license', 80)
  };
  if (origin.sourceUrl !== undefined) {
    const url = text(origin.sourceUrl, 'attribution.sourceUrl', 2000);
    let parsed;
    try { parsed = new URL(url); } catch { throw new RangeError('sourceUrl must be a valid HTTPS URL'); }
    if (parsed.protocol !== 'https:') throw new RangeError('sourceUrl must be a valid HTTPS URL');
    attribution.sourceUrl = url;
  }

  const units = distinctEntries(rows(pack.units, 'units', OPEN_CONTENT_PACK_LIMITS.maxUnits, 1).map((raw, i) => {
    const x = object(raw, 'units[' + i + ']');
    return {
      id: identifier(x.id, 'unit.id'),
      label: text(x.label, 'unit.label'),
      ...(x.prerequisiteIds === undefined ? {} : { prerequisiteIds: ids(x.prerequisiteIds, 'unit.prerequisiteIds') })
    };
  }), 'unit');
  const outcomes = distinctEntries(rows(pack.outcomes, 'outcomes', OPEN_CONTENT_PACK_LIMITS.maxOutcomes, 1).map((raw, i) => {
    const x = object(raw, 'outcomes[' + i + ']');
    return {
      id: identifier(x.id, 'outcome.id'),
      unitId: identifier(x.unitId, 'outcome.unitId'),
      label: text(x.label, 'outcome.label'),
      ...(x.prerequisiteIds === undefined ? {} : { prerequisiteIds: ids(x.prerequisiteIds, 'outcome.prerequisiteIds') })
    };
  }), 'outcome');
  const materials = { lessons: [], questions: [] };
  const resources = distinctEntries(rows(pack.lessons, 'lessons', OPEN_CONTENT_PACK_LIMITS.maxLessons).map((raw, i) => {
    const x = object(raw, 'lessons[' + i + ']');
    const id = identifier(x.id, 'lesson.id');
    const resource = {
      id, kind: 'lesson',
      revision: identifier(x.revision, 'lesson.revision'),
      outcomeIds: ids(x.outcomeIds, 'lesson.outcomeIds', 1),
      ...(x.misconceptionIds === undefined ? {} : { misconceptionIds: ids(x.misconceptionIds, 'lesson.misconceptionIds') })
    };
    materials.lessons.push({
      id, title: text(x.title, 'lesson.title'),
      bodyText: text(x.bodyText, 'lesson.bodyText', 10000),
      ...(x.visual === undefined ? {} : { visual: lessonVisual(x.visual) })
    });
    return resource;
  }), 'lesson');
  const questions = distinctEntries(rows(pack.questions, 'questions', OPEN_CONTENT_PACK_LIMITS.maxQuestions, 1).map((raw, i) => {
    const x = object(raw, 'questions[' + i + ']');
    const id = identifier(x.id, 'question.id');
    const choices = distinctEntries(rows(x.choices, 'question.choices', 8, 2).map((choice, choiceIndex) => {
      const y = object(choice, 'choice[' + choiceIndex + ']');
      const choiceId = identifier(y.id, 'choice.id');
      return {
        id: choiceId,
        ...(y.misconceptionId === undefined ? {} : { misconceptionId: identifier(y.misconceptionId, 'choice.misconceptionId') })
      };
    }), 'choice');
    const correctChoiceId = identifier(x.correctChoiceId, 'question.correctChoiceId');
    if (!choices.some(choice => choice.id === correctChoiceId)) {
      throw new RangeError('correct choice missing from question: ' + id);
    }
    materials.questions.push({
      id,
      prompt: text(x.prompt, 'question.prompt', 2000),
      choices: x.choices.map((choice, index) => ({
        id: choices[index].id,
        text: text(choice.text, 'choice.text', 1000)
      }))
    });
    return {
      id, revision: identifier(x.revision, 'question.revision'),
      outcomeIds: ids(x.outcomeIds, 'question.outcomeIds', 1),
      correctChoiceId,
      choices
    };
  }), 'question');
  const mappings = distinctEntries(rows(pack.mappings ?? [], 'mappings', OPEN_CONTENT_PACK_LIMITS.maxMappings).map((raw, i) => {
    const x = object(raw, 'mappings[' + i + ']');
    return { id: identifier(x.cardId, 'mapping.cardId'), questionId: identifier(x.questionId, 'mapping.questionId') };
  }), 'mapping').map(({ id, questionId }) => ({ cardId: id, questionId }));
  const core = {
    format: 'fark-knowledge-core', version: 1,
    units, outcomes, resources, questions, mappings
  };
  validateKnowledgeCore(core);
  return {
    core,
    materials,
    attribution,
    disclaimer: 'License and attribution come from the supplied content pack and are not independently verified. Observed answers do not prove mastery or causal lesson effectiveness.'
  };
}
