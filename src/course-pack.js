import { createCard } from './index.js';
import { importStudyDeck } from './portable.js';
import { importStudyCsv } from './csv.js';
import { importStudyMarkdown } from './markdown.js';
import { validateKnowledgeCore } from './knowledge-core.js';
import { auditLearningContent } from './content-readiness.js';
import { parseMarkdownToKnowledgeCore, parseCsvToKnowledgeCore } from './core-adapter.js';

export const COURSE_PACK_FORMAT = 'fark-course-pack';
export const COURSE_PACK_VERSION = 1;

const MAX_COURSE_FILE_BYTES = 1_000_000;
const ALLOWED_KINDS = new Set(['closed-loop', 'flashcards']);
const ALLOWED_SOURCES = new Set(['builtin', 'uploaded', 'registered']);
const ALLOWED_ACCENTS = new Set(['cobalt', 'emerald', 'amber', 'indigo', 'slate']);

function slugifyId(raw, fallback = 'course') {
  const clean = String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return clean || fallback;
}

function normalizeLocalized(value, fieldName, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed && !fallback) {
      throw new RangeError(`${fieldName} must be a non-empty string or { en, tr } object`);
    }
    const text = trimmed || fallback;
    return { en: text, tr: text };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const en = typeof value.en === 'string' ? value.en.trim() : '';
    const tr = typeof value.tr === 'string' ? value.tr.trim() : '';
    if (!en && !tr) {
      if (fallback) return { en: fallback, tr: fallback };
      throw new RangeError(`${fieldName} must provide at least en or tr text`);
    }
    return { en: en || tr, tr: tr || en };
  }
  if (fallback) return { en: fallback, tr: fallback };
  throw new RangeError(`${fieldName} must be a string or { en, tr } object`);
}

export function resolveLocalizedText(value, lang = 'en') {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  if (lang === 'tr') return value.tr || value.en || '';
  return value.en || value.tr || '';
}

function clonePayload(payload) {
  return structuredClone(payload);
}

export function validateCoursePack(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Course pack must be an object');
  }
  const kind = input.kind ?? input.mode;
  if (!ALLOWED_KINDS.has(kind)) {
    throw new RangeError(`Course pack kind must be "closed-loop" or "flashcards" (got "${String(kind)}")`);
  }
  const id = typeof input.id === 'string' && input.id.trim()
    ? slugifyId(input.id.trim(), 'course')
    : slugifyId(resolveLocalizedText(input.title, 'en'), 'course');
  if (!id) throw new RangeError('Course pack id must be non-empty');

  const title = normalizeLocalized(input.title, 'title');
  const subtitle = normalizeLocalized(input.subtitle ?? input.description, 'subtitle', resolveLocalizedText(title, 'en'));
  const category = normalizeLocalized(input.category, 'category', kind === 'closed-loop' ? 'Course' : 'Flashcards');
  const accent = ALLOWED_ACCENTS.has(input.accent) ? input.accent : 'cobalt';
  const source = ALLOWED_SOURCES.has(input.source) ? input.source : 'registered';
  const icon = typeof input.icon === 'string' && input.icon.trim() ? input.icon.trim().slice(0, 24) : 'book';

  if (kind === 'closed-loop') {
    const rawCore = input.payload ?? input.core;
    if (!rawCore || typeof rawCore !== 'object') {
      throw new TypeError('closed-loop course pack requires a Knowledge Core payload');
    }
    const core = clonePayload(rawCore);
    validateKnowledgeCore(core);
    const readiness = auditLearningContent(core);
    const outcomeCount = Array.isArray(core.outcomes) ? core.outcomes.length : 0;
    const questionCount = Array.isArray(core.questions) ? core.questions.length : 0;
    const estimatedMinutes = Number.isInteger(input.estimatedMinutes) && input.estimatedMinutes > 0
      ? input.estimatedMinutes
      : Math.max(2, Math.round(outcomeCount * 1.5));

    return {
      format: COURSE_PACK_FORMAT,
      version: COURSE_PACK_VERSION,
      id,
      kind,
      title,
      subtitle,
      category,
      accent,
      icon,
      source,
      estimatedMinutes,
      itemCount: outcomeCount,
      questionCount,
      readyCount: readiness.summary.ready,
      payload: core
    };
  }

  // kind === 'flashcards'
  const rawCards = input.payload ?? input.cards;
  if (!Array.isArray(rawCards) || rawCards.length === 0) {
    throw new RangeError('flashcards course pack requires a non-empty cards array');
  }
  const cards = rawCards.map((raw, idx) => {
    if (raw && typeof raw === 'object' && typeof raw.box === 'number' && typeof raw.dueAt === 'string') {
      return clonePayload(raw);
    }
    return createCard({
      id: raw?.id || `${id}-card-${idx + 1}`,
      topic: raw?.topic || resolveLocalizedText(title, 'en'),
      question: raw?.question,
      answer: raw?.answer
    });
  });
  const estimatedMinutes = Number.isInteger(input.estimatedMinutes) && input.estimatedMinutes > 0
    ? input.estimatedMinutes
    : Math.max(2, Math.ceil(cards.length / 3));

  return {
    format: COURSE_PACK_FORMAT,
    version: COURSE_PACK_VERSION,
    id,
    kind,
    title,
    subtitle,
    category,
    accent,
    icon,
    source,
    estimatedMinutes,
    itemCount: cards.length,
    questionCount: cards.length,
    readyCount: cards.length,
    payload: cards
  };
}

export function serializeCoursePack(pack) {
  const validated = validateCoursePack(pack);
  return JSON.stringify(
    {
      format: COURSE_PACK_FORMAT,
      version: COURSE_PACK_VERSION,
      id: validated.id,
      kind: validated.kind,
      title: validated.title,
      subtitle: validated.subtitle,
      category: validated.category,
      accent: validated.accent,
      icon: validated.icon,
      estimatedMinutes: validated.estimatedMinutes,
      payload: validated.payload
    },
    null,
    2
  );
}

function titleFromFilename(filename) {
  const base = String(filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!base) return 'Custom Course';
  return base.replace(/\b\w/g, ch => ch.toUpperCase());
}

function looksLikeClosedLoopMarkdown(text) {
  return /^\s*#{1,2}\s*(?:unit|ünite|outcome|kazanım|konu)\b/im.test(text) ||
    (/^\s*(?:Q|S):/im.test(text) && /^\s*\*\s+/m.test(text));
}

function looksLikeClosedLoopCsv(text) {
  const firstLine = String(text || '').trim().split(/\r?\n/)[0]?.toLowerCase() ?? '';
  return firstLine.includes('outcome') && (firstLine.includes('choice_a') || firstLine.includes('question'));
}

export function parseCoursePackFile(rawText, options = {}) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new RangeError('Course file is empty');
  }
  if (rawText.length > MAX_COURSE_FILE_BYTES) {
    throw new RangeError('Course file is too large (max 1 MB)');
  }

  const filename = typeof options.filename === 'string' ? options.filename : '';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const trimmed = rawText.trim();
  const fallbackTitle = options.title || titleFromFilename(filename);
  const warnings = [];

  // 1. JSON formats: fark-course-pack, fark-knowledge-core, fark-study-deck
  if (ext === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new SyntaxError('Invalid JSON file. Check commas and quotes.');
    }

    if (parsed && parsed.format === COURSE_PACK_FORMAT) {
      const pack = validateCoursePack({ ...parsed, source: options.source ?? 'uploaded' });
      const readiness = pack.kind === 'closed-loop' ? auditLearningContent(pack.payload) : null;
      return { pack, readiness, warnings };
    }

    if (parsed && (parsed.format === 'fark-knowledge-core' || (Array.isArray(parsed.outcomes) && Array.isArray(parsed.questions)))) {
      validateKnowledgeCore(parsed);
      const readiness = auditLearningContent(parsed);
      const pack = validateCoursePack({
        id: options.id || slugifyId(parsed.id || parsed.title || fallbackTitle, 'custom-course'),
        kind: 'closed-loop',
        title: parsed.title || fallbackTitle,
        subtitle: {
          en: `${parsed.outcomes.length} topics · ${parsed.questions.length} interactive questions`,
          tr: `${parsed.outcomes.length} konu · ${parsed.questions.length} etkileşimli soru`
        },
        category: { en: 'Custom Course', tr: 'Özel Kurs' },
        accent: 'indigo',
        icon: 'book',
        source: options.source ?? 'uploaded',
        payload: parsed
      });
      return { pack, readiness, warnings };
    }

    // Fallback: portable fark-study-deck JSON
    const deckCards = importStudyDeck(trimmed);
    const pack = validateCoursePack({
      id: options.id || slugifyId(fallbackTitle, 'custom-deck'),
      kind: 'flashcards',
      title: fallbackTitle,
      subtitle: {
        en: `${deckCards.length} spaced-review flashcards`,
        tr: `${deckCards.length} aralıklı tekrar kartı`
      },
      category: { en: 'Flashcard Deck', tr: 'Kart Destesi' },
      accent: 'emerald',
      icon: 'cards',
      source: options.source ?? 'uploaded',
      payload: deckCards
    });
    return { pack, readiness: null, warnings };
  }

  // 2. CSV: Knowledge Core table OR Flashcard CSV
  if (ext === 'csv' || looksLikeClosedLoopCsv(trimmed)) {
    if (looksLikeClosedLoopCsv(trimmed)) {
      const res = parseCsvToKnowledgeCore(trimmed, {
        title: fallbackTitle,
        id: slugifyId(fallbackTitle, 'csv-course')
      });
      warnings.push(...(res.warnings ?? []));
      const pack = validateCoursePack({
        id: options.id || slugifyId(res.core.title || fallbackTitle, 'csv-course'),
        kind: 'closed-loop',
        title: res.core.title || fallbackTitle,
        subtitle: {
          en: `${res.stats.outcomes} topics · ${res.stats.questions} interactive questions`,
          tr: `${res.stats.outcomes} konu · ${res.stats.questions} etkileşimli soru`
        },
        category: { en: 'Custom Course', tr: 'Özel Kurs' },
        accent: 'cobalt',
        icon: 'book',
        source: options.source ?? 'uploaded',
        payload: res.core
      });
      return { pack, readiness: res.readiness, warnings };
    }
    const cards = importStudyCsv(trimmed);
    const pack = validateCoursePack({
      id: options.id || slugifyId(fallbackTitle, 'csv-deck'),
      kind: 'flashcards',
      title: fallbackTitle,
      subtitle: {
        en: `${cards.length} spaced-review flashcards`,
        tr: `${cards.length} aralıklı tekrar kartı`
      },
      category: { en: 'Flashcard Deck', tr: 'Kart Destesi' },
      accent: 'emerald',
      icon: 'cards',
      source: options.source ?? 'uploaded',
      payload: cards
    });
    return { pack, readiness: null, warnings };
  }

  // 3. Markdown: Closed-loop curriculum OR Q :: A flashcards
  if (looksLikeClosedLoopMarkdown(trimmed)) {
    const res = parseMarkdownToKnowledgeCore(trimmed, {
      title: fallbackTitle,
      id: slugifyId(fallbackTitle, 'md-course')
    });
    warnings.push(...(res.warnings ?? []));
    const pack = validateCoursePack({
      id: options.id || slugifyId(res.core.title || fallbackTitle, 'md-course'),
      kind: 'closed-loop',
      title: res.core.title || fallbackTitle,
      subtitle: {
        en: `${res.stats.outcomes} topics · ${res.stats.questions} interactive questions`,
        tr: `${res.stats.outcomes} konu · ${res.stats.questions} etkileşimli soru`
      },
      category: { en: 'Custom Course', tr: 'Özel Kurs' },
      accent: 'cobalt',
      icon: 'book',
      source: options.source ?? 'uploaded',
      payload: res.core
    });
    return { pack, readiness: res.readiness, warnings };
  }

  const mdCards = importStudyMarkdown(trimmed);
  if (mdCards.length > 0) {
    const pack = validateCoursePack({
      id: options.id || slugifyId(fallbackTitle, 'md-deck'),
      kind: 'flashcards',
      title: fallbackTitle,
      subtitle: {
        en: `${mdCards.length} spaced-review flashcards`,
        tr: `${mdCards.length} aralıklı tekrar kartı`
      },
      category: { en: 'Flashcard Deck', tr: 'Kart Destesi' },
      accent: 'emerald',
      icon: 'cards',
      source: options.source ?? 'uploaded',
      payload: mdCards
    });
    return { pack, readiness: null, warnings };
  }

  throw new RangeError('Unsupported course format. Use FARK JSON, Markdown (# Unit / ## Outcome / Q:), or CSV.');
}

export function createCourseRegistry(initialPacks = []) {
  const packs = new Map();
  const listeners = new Set();

  const notify = () => {
    const snapshot = listCoursePacks();
    for (const fn of listeners) fn(snapshot);
  };

  function registerCoursePack(input) {
    const validated = validateCoursePack(input);
    packs.set(validated.id, validated);
    notify();
    return structuredClone(validated);
  }

  function unregisterCoursePack(id) {
    if (!packs.has(id)) return false;
    packs.delete(id);
    notify();
    return true;
  }

  function getCoursePack(id) {
    const found = packs.get(id);
    return found ? structuredClone(found) : null;
  }

  function listCoursePacks() {
    return [...packs.values()].map(p => structuredClone(p));
  }

  function exportCoursePackJson(id) {
    const found = packs.get(id);
    if (!found) throw new RangeError(`Unknown course pack: ${id}`);
    return serializeCoursePack(found);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  for (const item of initialPacks) {
    const validated = validateCoursePack(item);
    packs.set(validated.id, validated);
  }

  return {
    registerCoursePack,
    unregisterCoursePack,
    getCoursePack,
    listCoursePacks,
    exportCoursePackJson,
    subscribe
  };
}
