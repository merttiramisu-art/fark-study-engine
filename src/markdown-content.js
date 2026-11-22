/**
 * FARK Markdown Content Bridge v1.
 * Strict authoring subset, not a general Markdown parser.
 * Lesson body text stays INERT; never render untrusted content with innerHTML.
 * Offline, no third-party dependency, no execution.
 */
import { importOpenContentPack, OPEN_CONTENT_PACK_LIMITS } from './content-adapter.js';

export const MARKDOWN_CONTENT_LIMITS = Object.freeze({
  maxBytes: OPEN_CONTENT_PACK_LIMITS.maxBytes,
  maxLines: 20000
});
const ROOT = new Set(['version', 'title', 'creator', 'license', 'sourceUrl']);
const FIELDS = {
  Unit: new Set(['label', 'prerequisiteIds']),
  Outcome: new Set(['label', 'unitId', 'prerequisiteIds']),
  Lesson: new Set(['revision', 'title', 'outcomeIds', 'misconceptionIds', 'visualLeft', 'visualRight']),
  Question: new Set(['revision', 'outcomeIds', 'prompt', 'correctChoiceId']),
  Mapping: new Set(['questionId'])
};
const SECTION = /^## (Unit|Outcome|Lesson|Question|Mapping): ([A-Za-z0-9][A-Za-z0-9._-]{0,79})$/;
const FIELD = /^([A-Za-z][A-Za-z0-9]*): (.+)$/;
const CHOICE = /^- ([A-Za-z0-9][A-Za-z0-9._-]{0,79}) \| ([^|]+?)(?: \| misconception=([A-Za-z0-9][A-Za-z0-9._-]{0,79}))?$/;

function addField(fields, line, allowed, where) {
  const match = FIELD.exec(line);
  if (!match || !allowed.has(match[1])) {
    throw new SyntaxError('unsupported ' + where + ' field: ' + line.slice(0, 80));
  }
  const [, key, raw] = match;
  const value = raw.trim();
  if (!value) throw new SyntaxError('empty ' + where + '.' + key);
  if (fields.has(key)) throw new RangeError('duplicate ' + where + '.' + key);
  fields.set(key, value);
}
function required(fields, key, where) {
  const value = fields.get(key);
  if (!value) throw new SyntaxError('missing ' + where + '.' + key);
  return value;
}
function optionalList(fields, key) {
  if (!fields.has(key)) return undefined;
  const list = fields.get(key).split(',').map(item => item.trim());
  if (list.some(item => !item)) throw new SyntaxError('empty list item in ' + key);
  return list;
}
function requiredList(fields, key, where) {
  required(fields, key, where);
  return optionalList(fields, key);
}
function fractionField(raw, name) {
  const match = /^(0|[1-9][0-9]?)\/([1-9][0-9]?)$/.exec(raw);
  if (!match) throw new SyntaxError(name + ' must be a positive denominator fraction such as 1/3');
  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}
function finalize(section, pack) {
  if (!section) return;
  const { kind, id, fields } = section;
  if (kind === 'Unit') {
    const entry = { id, label: required(fields, 'label', kind) };
    const prerequisites = optionalList(fields, 'prerequisiteIds');
    if (prerequisites) entry.prerequisiteIds = prerequisites;
    pack.units.push(entry);
  } else if (kind === 'Outcome') {
    const entry = { id, unitId: required(fields, 'unitId', kind), label: required(fields, 'label', kind) };
    const prerequisites = optionalList(fields, 'prerequisiteIds');
    if (prerequisites) entry.prerequisiteIds = prerequisites;
    pack.outcomes.push(entry);
  } else if (kind === 'Lesson') {
    if (!section.bodyStarted) throw new SyntaxError('missing Lesson Body section: ' + id);
    const bodyText = section.body.join('\n').trim();
    if (!bodyText) throw new SyntaxError('empty lesson body: ' + id);
    const entry = {
      id,
      revision: required(fields, 'revision', kind),
      title: required(fields, 'title', kind),
      outcomeIds: requiredList(fields, 'outcomeIds', kind),
      bodyText
    };
    const misconceptionIds = optionalList(fields, 'misconceptionIds');
    if (misconceptionIds) entry.misconceptionIds = misconceptionIds;
    if (fields.has('visualLeft') !== fields.has('visualRight')) {
      throw new SyntaxError('visualLeft and visualRight must both be provided');
    }
    if (fields.has('visualLeft')) entry.visual = {
      kind: 'fraction-comparison',
      left: fractionField(fields.get('visualLeft'), 'visualLeft'),
      right: fractionField(fields.get('visualRight'), 'visualRight')
    };
    pack.lessons.push(entry);
  } else if (kind === 'Question') {
    if (section.choices.length < 2) throw new SyntaxError('question needs at least two choices: ' + id);
    pack.questions.push({
      id,
      revision: required(fields, 'revision', kind),
      outcomeIds: requiredList(fields, 'outcomeIds', kind),
      prompt: required(fields, 'prompt', kind),
      correctChoiceId: required(fields, 'correctChoiceId', kind),
      choices: section.choices
    });
  } else {
    pack.mappings.push({ cardId: id, questionId: required(fields, 'questionId', kind) });
  }
}

/**
 * Convert strictly delimited FARK Markdown into a validated content pack.
 * The Markdown body is preserved as inert text and never evaluated.
 * No frontmatter, embedded scripts or generic Markdown HTML compilation.
 */
export function importMarkdownContentPack(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('markdown must be a string');
  if (markdown.length > MARKDOWN_CONTENT_LIMITS.maxBytes ||
      new TextEncoder().encode(markdown).length > MARKDOWN_CONTENT_LIMITS.maxBytes) {
    throw new RangeError('Markdown content exceeds 1 MiB');
  }
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > MARKDOWN_CONTENT_LIMITS.maxLines) {
    throw new RangeError('Markdown content has too many lines');
  }
  if (lines.shift()?.replace(/^\uFEFF/, '') !== '# FARK Content Pack') {
    throw new SyntaxError('document must start with # FARK Content Pack');
  }
  const pack = {
    format: 'fark-open-content-pack', version: 1,
    attribution: {}, units: [], outcomes: [], lessons: [], questions: [], mappings: []
  };
  const root = new Map();
  let section = null;
  for (const [index, line] of lines.entries()) {
    const at = 'line ' + (index + 2);
    if (line.startsWith('## ')) {
      const found = SECTION.exec(line);
      if (!found) throw new SyntaxError('unsupported section at ' + at);
      finalize(section, pack);
      section = { kind: found[1], id: found[2], fields: new Map(), body: [], bodyStarted: false, choices: [] };
      continue;
    }
    if (section?.kind === 'Lesson' && section.bodyStarted) {
      section.body.push(line);
      continue;
    }
    if (!line.trim()) continue;
    if (!section) {
      addField(root, line, ROOT, 'document');
      continue;
    }
    if (line === '### Body' && section.kind === 'Lesson') {
      section.bodyStarted = true;
      continue;
    }
    if (section.kind === 'Question' && line.startsWith('- ')) {
      const found = CHOICE.exec(line);
      if (!found) throw new SyntaxError('invalid question choice at ' + at);
      section.choices.push({
        id: found[1], text: found[2].trim(),
        ...(found[3] ? { misconceptionId: found[3] } : {})
      });
      continue;
    }
    if (line.startsWith('#') || line.startsWith(String.fromCharCode(96).repeat(3))) {
      throw new SyntaxError('unsupported heading or fenced code outside lesson body at ' + at);
    }
    addField(section.fields, line, FIELDS[section.kind], section.kind);
  }
  finalize(section, pack);
  if (required(root, 'version', 'document') !== '1') {
    throw new RangeError('unsupported Markdown content version');
  }
  pack.attribution = {
    title: required(root, 'title', 'document'),
    creator: required(root, 'creator', 'document'),
    license: required(root, 'license', 'document'),
    ...(root.has('sourceUrl') ? { sourceUrl: root.get('sourceUrl') } : {})
  };
  return importOpenContentPack(pack);
}
