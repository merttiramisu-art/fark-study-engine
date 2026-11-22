/**
 * Gate H Open Content Adapter: converts clean Markdown notes or CSV tables
 * into strictly validated `fark-knowledge-core` v1 modules with live Content Readiness audits.
 *
 * Zero dependencies, offline-first, deterministic slug generation, cycle-checked DAG.
 */
import { validateKnowledgeCore } from './knowledge-core.js';
import { auditLearningContent } from './content-readiness.js';

const MAX_INPUT_CHARS = 500_000;

export const SAMPLE_CORE_MARKDOWN = Object.freeze({
  en: `# Unit: Web Security Foundations
## Outcome: Input Boundary Validation
Lesson: Always validate untrusted inputs at parser and storage boundaries.
Wrong: Client-side HTML attributes alone guarantee safe input.
Right: Every trust boundary must enforce type, range, and size constraints explicitly.
Example: Reject strings exceeding 256 characters before storing or evaluating.

Q: Why is client-side HTML validation alone insufficient for security?
* Attackers can send forged requests directly to boundaries bypassing the browser
- Browsers ignore maxlength attributes on text inputs [misconception: browser-only-trust]
- Server validation is slower than CSS animations

Q: Which boundary must enforce input type and size limits?
* Every untrusted parser, API, and storage entry point
- Only the sign-in form [misconception: perimeter-only-validation]
- Only numeric fields

## Outcome: Output Context Encoding
Prereq: Input Boundary Validation
Lesson: Encode dynamic text for the exact output context (DOM textContent vs HTML).
Wrong: Stripping the word script prevents cross-site scripting.
Right: Use safe DOM text APIs (textContent) or context-aware escaping rather than ad-hoc regex filters.
Example: Assign user labels with el.textContent instead of el.innerHTML.

Q: What is the safest way to insert untrusted text into a DOM element?
* Assign it via element.textContent
- Concatenate it into innerHTML after removing <script> tags [misconception: regex-sanitization-myth]
- Wrap it in a <span> string

Q: Why do naive regex filters fail against XSS payloads?
* HTML parsers interpret attributes, event handlers, and encodings beyond <script> tags
- Regular expressions cannot match angle brackets [misconception: regex-sanitization-myth]
- Browsers only execute inline scripts inside <footer>`,

  tr: `# Ünite: Web Güvenliği Temelleri
## Kazanım: Girdi Sınır Doğrulaması
Ders: Güvenilmeyen her girdiyi ayrıştırıcı ve kayıt sınırında açıkça doğrula.
Yanlış: Tarayıcıdaki HTML required veya maxlength nitelikleri tek başına güvenlik sağlar.
Doğru: Her güven sınırında tip, aralık ve uzunluk kuralları sunucu veya motor tarafında zorunlu kılınmalıdır.
Örnek: 256 karakteri aşan metinleri işlemeden önce reddet.

S: Yalnızca istemci (tarayıcı) tarafı HTML doğrulaması neden yeterli değildir?
* Saldırganlar tarayıcıyı atlayarak sınıra doğrudan bozuk istek gönderebilir
- Tarayıcılar maxlength niteliğini desteklemez [yanılgı: tarayici-guveni]
- Sunucu doğrulaması CSS yüklemesini yavaşlatır

S: Girdi boyutu ve türü hangi noktada mutlaka denetlenmelidir?
* Güvenilmeyen veri alan her ayrıştırıcı, API ve kayıt girişinde
- Yalnızca giriş (login) ekranında [yanılgı: tek-nokta-dogrulama]
- Yalnızca sayısal alanlarda

## Kazanım: Çıktı Bağlamı Kodlaması
Önkoşul: Girdi Sınır Doğrulaması
Ders: Dinamik metni ekleneceği bağlama göre güvenli DOM API'leriyle yerleştir.
Yanlış: Metinden script kelimesini silmek XSS saldırılarını tamamen engeller.
Doğru: Geçici regex temizliği yerine element.textContent veya bağlama duyarlı kaçış kullan.
Örnek: Kullanıcı etiketlerini innerHTML yerine el.textContent ile yaz.

S: Güvenilmeyen metni DOM düğümüne yerleştirmenin en güvenli yolu nedir?
* element.textContent üzerinden atamak
- <script> etiketini silip innerHTML ile eklemek [yanılgı: regex-temizlik-yanilgisi]
- Metni <span> içine koymak

S: Basit regex filtreleri XSS karşısında neden yetersiz kalır?
* HTML ayrıştırıcıları olay niteliklerini ve alternatif kodlamaları <script> olmadan da çalıştırabilir
- Regex ifadeleri < ve > karakterlerini eşleyemez [yanılgı: regex-temizlik-yanilgisi]
- Tarayıcılar yalnızca footer içindeki betikleri çalıştırır`
});

function deterministicSlug(prefix, raw, usedSet) {
  const base = String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28) || 'item';
  let candidate = `${prefix}-${base}`;
  let suffix = 2;
  while (usedSet.has(candidate)) {
    candidate = `${prefix}-${base}-${suffix}`;
    suffix += 1;
  }
  usedSet.add(candidate);
  return candidate;
}

function parseChoiceLine(line) {
  const isCorrect = line.startsWith('*');
  const rawBody = line.slice(1).trim();
  const tagMatch = rawBody.match(/\[(?:misconception|yan[ıi]lg[ıi])\s*:\s*([^\]]+)\]\s*$/i);
  let label = rawBody;
  let misconceptionId = null;
  if (tagMatch) {
    misconceptionId = tagMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    label = rawBody.slice(0, tagMatch.index).trim();
  }
  return { isCorrect, label, misconceptionId };
}

/**
 * Parse structured Markdown curriculum notes into a validated `fark-knowledge-core` v1 object.
 * Supports both English and Turkish headings (`# Unit:`/`# Ünite:`, `## Outcome:`/`## Kazanım:`,
 * `Prereq:`/`Önkoşul:`, `Lesson:`/`Ders:`, `Wrong:`/`Yanlış:`, `Right:`/`Doğru:`, `Q:`/`S:`).
 */
export function parseMarkdownToKnowledgeCore(markdownText, options = {}) {
  if (typeof markdownText !== 'string' || !markdownText.trim()) {
    throw new TypeError('markdownText must be a non-empty string');
  }
  if (markdownText.length > MAX_INPUT_CHARS) {
    throw new RangeError(`markdownText exceeds maximum of ${MAX_INPUT_CHARS} characters`);
  }

  const lines = markdownText.replace(/\r\n?/g, '\n').split('\n');
  const usedIds = new Set();
  const warnings = [];

  const units = [];
  const outcomes = [];
  const resources = [];
  const questions = [];

  const outcomeByLowerTitle = new Map();
  const pendingPrereqs = [];

  let currentUnit = null;
  let currentOutcome = null;
  let currentLesson = null;
  let currentQuestion = null;

  function ensureUnit() {
    if (currentUnit) return currentUnit;
    const defaultLabel = options.defaultUnitTitle ?? 'General Unit';
    currentUnit = {
      id: deterministicSlug('u', defaultLabel, usedIds),
      label: defaultLabel,
      prerequisiteIds: []
    };
    units.push(currentUnit);
    return currentUnit;
  }

  function flushLesson() {
    if (!currentLesson || !currentOutcome) {
      currentLesson = null;
      return;
    }
    if (currentLesson.summary) {
      resources.push({
        id: deterministicSlug('r', currentLesson.title || currentOutcome.label, usedIds),
        outcomeIds: [currentOutcome.id],
        kind: 'micro-lesson',
        revision: 'r1',
        title: currentLesson.title || `${currentOutcome.label} — Micro-Lesson`,
        summary: currentLesson.summary,
        ...(currentLesson.wrongIntuition ? { wrongIntuition: currentLesson.wrongIntuition } : {}),
        ...(currentLesson.rightPrinciple ? { rightPrinciple: currentLesson.rightPrinciple } : {}),
        ...(currentLesson.example ? { example: currentLesson.example } : {}),
        ...(currentLesson.misconceptionIds.length ? { misconceptionIds: [...new Set(currentLesson.misconceptionIds)] } : {})
      });
    }
    currentLesson = null;
  }

  function flushQuestion() {
    if (!currentQuestion || !currentOutcome) {
      currentQuestion = null;
      return;
    }
    const { prompt, choices, correctChoiceId } = currentQuestion;
    if (!prompt || choices.length < 2) {
      warnings.push(`Skipped incomplete question under "${currentOutcome.label}": needs prompt and >=2 choices.`);
    } else if (!correctChoiceId) {
      warnings.push(`Skipped question "${prompt.slice(0, 48)}": mark the correct option with '*'.`);
    } else {
      questions.push({
        id: deterministicSlug('q', prompt, usedIds),
        outcomeIds: [currentOutcome.id],
        revision: 'r1',
        prompt,
        choices,
        correctChoiceId
      });
    }
    currentQuestion = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // # Unit / # Ünite
    const unitMatch = line.match(/^#\s+(?:(?:Unit|Ünite)\s*:\s*)?(.+)$/i);
    if (unitMatch && !line.startsWith('##')) {
      flushQuestion();
      flushLesson();
      const label = unitMatch[1].trim();
      currentUnit = {
        id: deterministicSlug('u', label, usedIds),
        label,
        prerequisiteIds: []
      };
      units.push(currentUnit);
      currentOutcome = null;
      continue;
    }

    // ## Outcome / ## Kazanım
    const outcomeMatch = line.match(/^##\s+(?:(?:Outcome|Kazan[ıi]m)\s*:\s*)?(.+)$/i);
    if (outcomeMatch) {
      flushQuestion();
      flushLesson();
      const unit = ensureUnit();
      const label = outcomeMatch[1].trim();
      currentOutcome = {
        id: deterministicSlug('o', label, usedIds),
        unitId: unit.id,
        label,
        prerequisiteIds: []
      };
      outcomes.push(currentOutcome);
      outcomeByLowerTitle.set(label.toLowerCase(), currentOutcome.id);
      outcomeByLowerTitle.set(currentOutcome.id.toLowerCase(), currentOutcome.id);
      continue;
    }

    if (!currentOutcome) {
      // Auto-create an outcome if author jumps straight into Q:/Lesson:
      const unit = ensureUnit();
      const label = options.defaultOutcomeTitle ?? 'Core Outcome';
      currentOutcome = {
        id: deterministicSlug('o', label, usedIds),
        unitId: unit.id,
        label,
        prerequisiteIds: []
      };
      outcomes.push(currentOutcome);
      outcomeByLowerTitle.set(label.toLowerCase(), currentOutcome.id);
    }

    // Prereq / Önkoşul
    const prereqMatch = line.match(/^(?:Prereq|Prerequisite|Önkoşul|Onkosul)\s*:\s*(.+)$/i);
    if (prereqMatch) {
      const rawPrereqs = prereqMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s && !/^(none|yok|-)$/i.test(s));
      if (rawPrereqs.length) {
        pendingPrereqs.push({ outcome: currentOutcome, refs: rawPrereqs });
      }
      continue;
    }

    // Lesson / Ders
    const lessonMatch = line.match(/^(?:Lesson|Ders)\s*:\s*(.+)$/i);
    if (lessonMatch) {
      flushQuestion();
      flushLesson();
      currentLesson = {
        title: `${currentOutcome.label}`,
        summary: lessonMatch[1].trim(),
        wrongIntuition: '',
        rightPrinciple: '',
        example: '',
        misconceptionIds: []
      };
      continue;
    }

    const wrongMatch = line.match(/^(?:Wrong|Yanl[ıi]ş|Yanlis)\s*:\s*(.+)$/i);
    if (wrongMatch) {
      if (!currentLesson) currentLesson = { title: currentOutcome.label, summary: wrongMatch[1].trim(), wrongIntuition: '', rightPrinciple: '', example: '', misconceptionIds: [] };
      currentLesson.wrongIntuition = wrongMatch[1].trim();
      continue;
    }

    const rightMatch = line.match(/^(?:Right|Do[ğg]ru)\s*:\s*(.+)$/i);
    if (rightMatch) {
      if (!currentLesson) currentLesson = { title: currentOutcome.label, summary: rightMatch[1].trim(), wrongIntuition: '', rightPrinciple: '', example: '', misconceptionIds: [] };
      currentLesson.rightPrinciple = rightMatch[1].trim();
      continue;
    }

    const exMatch = line.match(/^(?:Example|Örnek|Ornek)\s*:\s*(.+)$/i);
    if (exMatch) {
      if (!currentLesson) currentLesson = { title: currentOutcome.label, summary: exMatch[1].trim(), wrongIntuition: '', rightPrinciple: '', example: '', misconceptionIds: [] };
      currentLesson.example = exMatch[1].trim();
      continue;
    }

    // Question: Q: / S:
    const qMatch = line.match(/^(?:Q|S|Question|Soru)\s*:\s*(.+)$/i);
    if (qMatch) {
      flushLesson();
      flushQuestion();
      currentQuestion = {
        prompt: qMatch[1].trim(),
        choices: [],
        correctChoiceId: null
      };
      continue;
    }

    // Choice lines (* correct, - distractor)
    if (currentQuestion && (line.startsWith('*') || line.startsWith('-'))) {
      const parsed = parseChoiceLine(line);
      if (!parsed.label) continue;
      const choiceId = String.fromCharCode(97 + currentQuestion.choices.length); // a, b, c, d...
      const choiceObj = { id: choiceId, label: parsed.label };
      if (!parsed.isCorrect && parsed.misconceptionId) {
        choiceObj.misconceptionId = parsed.misconceptionId;
      }
      currentQuestion.choices.push(choiceObj);
      if (parsed.isCorrect) {
        if (currentQuestion.correctChoiceId) {
          warnings.push(`Question "${currentQuestion.prompt.slice(0, 42)}" marked multiple '*' correct answers; using first.`);
        } else {
          currentQuestion.correctChoiceId = choiceId;
        }
      }
      continue;
    }
  }

  flushQuestion();
  flushLesson();

  // Resolve prerequisites by outcome title or ID
  for (const entry of pendingPrereqs) {
    for (const ref of entry.refs) {
      const resolvedId = outcomeByLowerTitle.get(ref.toLowerCase());
      if (resolvedId && resolvedId !== entry.outcome.id) {
        if (!entry.outcome.prerequisiteIds.includes(resolvedId)) {
          entry.outcome.prerequisiteIds.push(resolvedId);
        }
      } else {
        warnings.push(`Unresolved prerequisite "${ref}" on outcome "${entry.outcome.label}".`);
      }
    }
  }

  if (outcomes.length === 0) {
    throw new RangeError('No units or outcomes could be parsed from the Markdown input.');
  }

  const core = {
    format: 'fark-knowledge-core',
    version: 1,
    units,
    outcomes,
    resources,
    questions,
    mappings: []
  };

  validateKnowledgeCore(core);
  const readiness = auditLearningContent(core);

  return {
    core,
    readiness,
    stats: {
      units: units.length,
      outcomes: outcomes.length,
      questions: questions.length,
      resources: resources.length,
      readyOutcomes: readiness.summary.ready
    },
    warnings
  };
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  return rows;
}

/**
 * Parse a flat CSV curriculum table into a validated `fark-knowledge-core` v1 object.
 * Expected header columns (case-insensitive):
 * unit, outcome, prerequisite, question, choice_a, choice_b, choice_c, correct, misconception, lesson_summary, wrong_intuition, right_principle
 */
export function parseCsvToKnowledgeCore(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw new TypeError('csvText must be a non-empty string');
  }
  if (csvText.length > MAX_INPUT_CHARS) {
    throw new RangeError(`csvText exceeds maximum of ${MAX_INPUT_CHARS} characters`);
  }

  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new RangeError('CSV must contain a header row and at least one data row.');
  }

  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const col = name => headers.indexOf(name);
  const idxUnit = col('unit');
  const idxOutcome = col('outcome');
  const idxPrereq = col('prerequisite');
  const idxQuestion = col('question');
  const idxA = col('choice_a');
  const idxB = col('choice_b');
  const idxC = col('choice_c');
  const idxCorrect = col('correct');
  const idxMisc = col('misconception');
  const idxLesson = col('lesson_summary');
  const idxWrong = col('wrong_intuition');
  const idxRight = col('right_principle');

  if (idxOutcome < 0 || idxQuestion < 0 || idxA < 0 || idxB < 0 || idxCorrect < 0) {
    throw new RangeError('CSV header must include: outcome, question, choice_a, choice_b, correct');
  }

  const usedIds = new Set();
  const warnings = [];
  const unitByTitle = new Map();
  const outcomeByTitle = new Map();
  const lessonSeenByOutcome = new Set();
  const pendingPrereqs = [];

  const units = [];
  const outcomes = [];
  const resources = [];
  const questions = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const unitTitle = (idxUnit >= 0 && cells[idxUnit]) ? cells[idxUnit] : 'Imported Unit';
    const outcomeTitle = cells[idxOutcome] || '';
    if (!outcomeTitle) {
      warnings.push(`Row ${r + 1} skipped: missing outcome.`);
      continue;
    }

    let unit = unitByTitle.get(unitTitle.toLowerCase());
    if (!unit) {
      unit = { id: deterministicSlug('u', unitTitle, usedIds), label: unitTitle, prerequisiteIds: [] };
      unitByTitle.set(unitTitle.toLowerCase(), unit);
      units.push(unit);
    }

    let outcome = outcomeByTitle.get(outcomeTitle.toLowerCase());
    if (!outcome) {
      outcome = { id: deterministicSlug('o', outcomeTitle, usedIds), unitId: unit.id, label: outcomeTitle, prerequisiteIds: [] };
      outcomeByTitle.set(outcomeTitle.toLowerCase(), outcome);
      outcomes.push(outcome);
    }

    if (idxPrereq >= 0 && cells[idxPrereq]) {
      pendingPrereqs.push({ outcome, ref: cells[idxPrereq] });
    }

    const prompt = cells[idxQuestion] || '';
    const choiceA = cells[idxA] || '';
    const choiceB = cells[idxB] || '';
    const choiceC = idxC >= 0 ? (cells[idxC] || '') : '';
    const correctRaw = (cells[idxCorrect] || 'a').toLowerCase();
    const misc = idxMisc >= 0 ? (cells[idxMisc] || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') : '';

    if (prompt && choiceA && choiceB) {
      const choices = [
        { id: 'a', label: choiceA, ...(correctRaw !== 'a' && misc ? { misconceptionId: misc } : {}) },
        { id: 'b', label: choiceB, ...(correctRaw !== 'b' && misc ? { misconceptionId: misc } : {}) },
        ...(choiceC ? [{ id: 'c', label: choiceC, ...(correctRaw !== 'c' && misc ? { misconceptionId: misc } : {}) }] : [])
      ];
      if (choices.some(c => c.id === correctRaw)) {
        questions.push({
          id: deterministicSlug('q', prompt, usedIds),
          outcomeIds: [outcome.id],
          revision: 'r1',
          prompt,
          choices,
          correctChoiceId: correctRaw
        });
      } else {
        warnings.push(`Row ${r + 1}: invalid correct choice "${correctRaw}".`);
      }
    }

    const lessonSummary = idxLesson >= 0 ? (cells[idxLesson] || '') : '';
    if (lessonSummary && !lessonSeenByOutcome.has(outcome.id)) {
      lessonSeenByOutcome.add(outcome.id);
      resources.push({
        id: deterministicSlug('r', outcome.label, usedIds),
        outcomeIds: [outcome.id],
        kind: 'micro-lesson',
        revision: 'r1',
        title: outcome.label,
        summary: lessonSummary,
        ...(idxWrong >= 0 && cells[idxWrong] ? { wrongIntuition: cells[idxWrong] } : {}),
        ...(idxRight >= 0 && cells[idxRight] ? { rightPrinciple: cells[idxRight] } : {})
      });
    }
  }

  for (const item of pendingPrereqs) {
    const target = outcomeByTitle.get(item.ref.toLowerCase());
    if (target && target.id !== item.outcome.id && !item.outcome.prerequisiteIds.includes(target.id)) {
      item.outcome.prerequisiteIds.push(target.id);
    }
  }

  if (outcomes.length === 0) {
    throw new RangeError('No valid outcomes found in CSV rows.');
  }

  const core = {
    format: 'fark-knowledge-core',
    version: 1,
    units,
    outcomes,
    resources,
    questions,
    mappings: []
  };

  validateKnowledgeCore(core);
  const readiness = auditLearningContent(core);

  return {
    core,
    readiness,
    stats: {
      units: units.length,
      outcomes: outcomes.length,
      questions: questions.length,
      resources: resources.length,
      readyOutcomes: readiness.summary.ready
    },
    warnings
  };
}
