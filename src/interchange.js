/**
 * Rich card helpers (Cloze {{...}} / [[...]], reversible prompts),
 * Anki/Quizlet tab-separated (.tsv) interchange, and curated open-source sample packs.
 */
import { createCard, reviewCard, validateDeck } from './index.js';
import { PORTABLE_LIMITS } from './portable.js';

const CLOZE_RE = /\{\{(?:c\d+::)?([^}:]+?)(?:::([^}]+?))?\}\}|\[\[([^\]]+?)\]\]/g;
const TSV_OPTION_KEYS = new Set(['defaultTopic', 'idPrefix']);
const TSV_EXPORT_KEYS = new Set(['includeHeader']);

/**
 * Parse inline cloze deletions such as `The {{mitochondria}} produces {{c1::ATP::energy molecule}}.`
 * Also accepts `[[blank]]` syntax. Returns clean display strings without mutating the stored card.
 */
export function parseClozePrompt(question, fallbackAnswer = '') {
  const source = String(question ?? '');
  const targets = [];
  const hints = [];

  CLOZE_RE.lastIndex = 0;
  const maskedQuestion = source.replace(CLOZE_RE, (_, braceText, hintText, bracketText) => {
    const answer = (braceText ?? bracketText ?? '').trim();
    const hint = hintText ? hintText.trim() : '';
    targets.push(answer);
    if (hint) hints.push(hint);
    return hint ? `[ ___ (${hint}) ]` : '[ ___ ]';
  });

  if (targets.length === 0) {
    return {
      isCloze: false,
      maskedQuestion: source,
      targets: [],
      hints: [],
      revealedText: String(fallbackAnswer || source)
    };
  }

  CLOZE_RE.lastIndex = 0;
  const revealedText = source.replace(CLOZE_RE, (_, braceText, _hintText, bracketText) =>
    (braceText ?? bracketText ?? '').trim()
  );

  return {
    isCloze: true,
    maskedQuestion,
    targets,
    hints,
    revealedText
  };
}

/** Return an ephemeral swapped question/answer projection for bi-directional practice. */
export function reverseCardPrompt(card) {
  validateDeck([card]);
  return {
    ...card,
    question: card.answer,
    answer: card.question,
    isReversed: true
  };
}

function checkOptions(options, allowedKeys) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!allowedKeys.has(key)) throw new RangeError('unknown interchange option: ' + key);
  }
}

function cleanTsvField(value) {
  return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}

/**
 * Export validated cards as Anki/Quizlet-compatible tab-separated values (`topic\tquestion\tanswer`).
 */
export function exportStudyTsv(cards, options = {}) {
  validateDeck(cards);
  if (cards.length > PORTABLE_LIMITS.maxCards) {
    throw new RangeError(`deck exceeds the maximum of ${PORTABLE_LIMITS.maxCards} cards`);
  }
  checkOptions(options, TSV_EXPORT_KEYS);
  const includeHeader = options.includeHeader ?? true;
  const rows = [];
  if (includeHeader) {
    rows.push('topic\tquestion\tanswer');
  }
  for (const card of cards) {
    rows.push([cleanTsvField(card.topic), cleanTsvField(card.question), cleanTsvField(card.answer)].join('\t'));
  }
  const output = rows.join('\n');
  if (output.length > PORTABLE_LIMITS.maxChars) {
    throw new RangeError(`deck TSV exceeds ${PORTABLE_LIMITS.maxChars} characters`);
  }
  return output;
}

/**
 * Parse tab-separated Anki/Quizlet notes into unreviewed FARK cards.
 * Supports `#separator:tab` headers, optional `topic\tquestion\tanswer` or `id\ttopic\tquestion\tanswer`
 * header rows, or headerless 2-column (`question\tanswer`) / 3-column (`topic\tquestion\tanswer`) lines.
 */
export function importStudyTsv(tsvText, options = {}) {
  if (typeof tsvText !== 'string') throw new TypeError('TSV input must be a string');
  if (tsvText.length > PORTABLE_LIMITS.maxChars) {
    throw new RangeError(`TSV input exceeds ${PORTABLE_LIMITS.maxChars} characters`);
  }
  checkOptions(options, TSV_OPTION_KEYS);
  const defaultTopic = (options.defaultTopic ?? 'Imported').trim();
  if (!defaultTopic) throw new RangeError('defaultTopic must not be empty');
  const idPrefix = (options.idPrefix ?? 'tsv').trim();
  if (!idPrefix) throw new RangeError('idPrefix must not be empty');

  const text = tsvText.startsWith('\uFEFF') ? tsvText.slice(1) : tsvText;
  const rawLines = text.split(/\r?\n/);
  const dataLines = [];
  let deckTopic = defaultTopic;

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const deckDirective = line.match(/^#deck:(.+)$/i);
      if (deckDirective && deckDirective[1].trim()) {
        deckTopic = deckDirective[1].trim();
      }
      continue;
    }
    dataLines.push(raw);
  }

  if (dataLines.length === 0) {
    throw new RangeError('TSV input contains no cards');
  }
  if (dataLines.length > PORTABLE_LIMITS.maxCards) {
    throw new RangeError(`deck exceeds the maximum of ${PORTABLE_LIMITS.maxCards} cards`);
  }

  const firstCells = dataLines[0].split('\t').map(c => c.trim().toLowerCase());
  const looksLikeHeader =
    firstCells.includes('question') ||
    firstCells.includes('front') ||
    (firstCells.includes('topic') && firstCells.includes('answer'));

  let rows = dataLines;
  let colMap = null;
  if (looksLikeHeader) {
    colMap = {
      id: firstCells.indexOf('id'),
      topic: firstCells.indexOf('topic') >= 0 ? firstCells.indexOf('topic') : firstCells.indexOf('tags'),
      question: firstCells.indexOf('question') >= 0 ? firstCells.indexOf('question') : firstCells.indexOf('front'),
      answer: firstCells.indexOf('answer') >= 0 ? firstCells.indexOf('answer') : firstCells.indexOf('back')
    };
    if (colMap.question < 0 || colMap.answer < 0) {
      throw new RangeError('TSV header must include question/front and answer/back columns');
    }
    rows = dataLines.slice(1);
    if (rows.length === 0) throw new RangeError('TSV header has no card rows');
  }

  const cards = rows.map((rawLine, index) => {
    const cols = rawLine.split('\t').map(c => c.trim());
    let id;
    let topic;
    let question;
    let answer;

    if (colMap) {
      id = colMap.id >= 0 && cols[colMap.id] ? cols[colMap.id] : `${idPrefix}-${String(index + 1).padStart(4, '0')}`;
      topic = colMap.topic >= 0 && cols[colMap.topic] ? cols[colMap.topic] : deckTopic;
      question = cols[colMap.question] ?? '';
      answer = cols[colMap.answer] ?? '';
    } else if (cols.length === 2) {
      id = `${idPrefix}-${String(index + 1).padStart(4, '0')}`;
      topic = deckTopic;
      [question, answer] = cols;
    } else if (cols.length >= 3) {
      id = `${idPrefix}-${String(index + 1).padStart(4, '0')}`;
      [topic, question, answer] = cols;
    } else {
      throw new RangeError(`TSV line ${index + 1} needs at least 2 tab-separated columns`);
    }

    return createCard({
      id,
      topic: topic || deckTopic,
      question,
      answer
    });
  });

  validateDeck(cards);
  return cards;
}

export const SAMPLE_PACKS = Object.freeze([
  Object.freeze({
    id: 'starter',
    label: 'General Mix (Starter)',
    description: 'Balanced 9-card starter deck with sample review history and lapse reasons.'
  }),
  Object.freeze({
    id: 'computer-science',
    label: 'CS & Algorithms (with Cloze)',
    description: '8 computer science cards demonstrating inline {{cloze}} blanks alongside conceptual checks.'
  }),
  Object.freeze({
    id: 'biology',
    label: 'Cell Biology & Physiology',
    description: '7 biology prompts testing misconception vs attention-slip tracking.'
  }),
  Object.freeze({
    id: 'language',
    label: 'EN ↔ TR Study Vocabulary',
    description: '8 bilingual pairs ideal for trying Reverse Q↔A mode.'
  })
]);

function hoursBefore(hours, ref) {
  return new Date(ref.getTime() - hours * 60 * 60 * 1000).toISOString();
}

/** Build a fresh, original sample deck for a named curated starter pack. */
export function buildSamplePack(packId = 'starter', referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  if (Number.isNaN(ref.getTime())) throw new TypeError('referenceDate must be a valid date');

  if (packId === 'starter') {
    const make = (id, topic, question, answer) => createCard({ id, topic, question, answer });
    return [
      reviewCard(make('math-01', 'Mathematics', 'What is 18% of 250?', '45'), 'again', hoursBefore(36, ref), { reason: 'knowledge-gap' }),
      reviewCard(make('math-02', 'Mathematics', 'Solve 3x − 7 = 11.', 'x = 6'), 'good', hoursBefore(72, ref)),
      make('math-03', 'Mathematics', 'What is 7 squared?', '49'),
      reviewCard(make('science-01', 'Science', 'What gas do plants absorb during photosynthesis?', 'Carbon dioxide'), 'again', hoursBefore(42, ref), { reason: 'misconception' }),
      reviewCard(make('science-02', 'Science', 'At sea level, what is the approximate boiling point of water?', '100 °C (212 °F)'), 'easy', hoursBefore(120, ref)),
      make('language-01', 'Language', 'Give a synonym for “brief”.', 'Short or concise'),
      reviewCard(make('geography-01', 'Geography', 'Which ocean is the largest on Earth?', 'The Pacific Ocean'), 'hard', hoursBefore(30, ref)),
      reviewCard(make('history-01', 'History', 'Which century did the year 1492 belong to?', 'The 15th century'), 'good', hoursBefore(1, ref)),
      make('history-02', 'History', 'In which continent is ancient Carthage located?', 'Africa')
    ];
  }

  if (packId === 'computer-science') {
    const raw = [
      createCard({ id: 'cs-01', topic: 'Algorithms', question: 'Binary search requires a {{sorted}} sequence and runs in {{O(log n)}} time.', answer: 'sorted; O(log n)' }),
      createCard({ id: 'cs-02', topic: 'Algorithms', question: 'Which graph traversal uses a {{FIFO queue}} to find unweighted shortest paths?', answer: 'Breadth-First Search (BFS)' }),
      createCard({ id: 'cs-03', topic: 'Systems', question: 'Which HTTP methods are guaranteed to be idempotent in RFC 9110?', answer: 'GET, HEAD, PUT, DELETE, OPTIONS, TRACE' }),
      createCard({ id: 'cs-04', topic: 'Systems', question: 'In TCP, the {{3-way handshake}} exchanges SYN, {{SYN-ACK}}, and ACK.', answer: '3-way handshake; SYN-ACK' }),
      createCard({ id: 'cs-05', topic: 'Data Structures', question: 'Amortized time of pushing onto a doubling dynamic array is {{O(1)}}.', answer: 'O(1)' }),
      createCard({ id: 'cs-06', topic: 'Data Structures', question: 'What invariant separates a min-heap from a binary search tree?', answer: 'Min-heap orders parent <= children only; BST orders left < root < right globally.' }),
      createCard({ id: 'cs-07', topic: 'Concurrency', question: 'What four Coffman conditions together enable a resource deadlock?', answer: 'Mutual exclusion, hold and wait, no preemption, circular wait.' }),
      createCard({ id: 'cs-08', topic: 'Databases', question: 'An {{ACID}} transaction ensures Atomicity, Consistency, Isolation, and {{Durability}}.', answer: 'ACID; Durability' })
    ];
    raw[0] = reviewCard(raw[0], 'again', hoursBefore(50, ref), { reason: 'misconception' });
    raw[2] = reviewCard(raw[2], 'again', hoursBefore(30, ref), { reason: 'attention' });
    raw[4] = reviewCard(raw[4], 'good', hoursBefore(72, ref));
    return raw;
  }

  if (packId === 'biology') {
    const raw = [
      createCard({ id: 'bio-01', topic: 'Cell Biology', question: 'The {{mitochondrion}} generates {{ATP}} via oxidative phosphorylation.', answer: 'mitochondrion; ATP' }),
      createCard({ id: 'bio-02', topic: 'Cell Biology', question: 'Why is the rough endoplasmic reticulum studded with ribosomes?', answer: 'To synthesize proteins destined for membranes, organelles, or secretion.' }),
      createCard({ id: 'bio-03', topic: 'Genetics', question: 'During {{transcription}}, RNA polymerase builds mRNA using the {{3\'→5\'}} DNA template.', answer: 'transcription; 3\'→5\'' }),
      createCard({ id: 'bio-04', topic: 'Genetics', question: 'How does meiosis differ from mitosis in chromosome ploidy?', answer: 'Meiosis produces haploid (n) gametes; mitosis preserves diploid (2n) daughter cells.' }),
      createCard({ id: 'bio-05', topic: 'Physiology', question: 'Which heart valve separates the left atrium from the left ventricle?', answer: 'Mitral (bicuspid) valve' }),
      createCard({ id: 'bio-06', topic: 'Physiology', question: 'What hormone lowers blood glucose by promoting cellular uptake?', answer: 'Insulin (secreted by pancreatic beta cells)' }),
      createCard({ id: 'bio-07', topic: 'Ecology', question: 'What fraction of energy typically transfers cleanly to the next trophic level?', answer: 'Roughly 10% (most is lost as heat and metabolism).' })
    ];
    raw[1] = reviewCard(raw[1], 'again', hoursBefore(28, ref), { reason: 'misconception' });
    raw[3] = reviewCard(raw[3], 'again', hoursBefore(32, ref), { reason: 'misconception' });
    raw[5] = reviewCard(raw[5], 'good', hoursBefore(90, ref));
    return raw;
  }

  if (packId === 'language') {
    const pairs = [
      ['Vocabulary', 'resilient', 'dayanıklı, çabuk toparlanan'],
      ['Vocabulary', 'ambiguous', 'belirsiz, birden fazla anlama gelebilen'],
      ['Vocabulary', 'concise', 'özlü, kısa ve net'],
      ['Academic Verbs', 'corroborate', 'doğrulamak, kanıtla desteklemek'],
      ['Academic Verbs', 'mitigate', 'hafifletmek, etkisini azaltmak'],
      ['Academic Verbs', 'extrapolate', 'eldeki veriden öteye çıkarım yapmak'],
      ['Connectors', 'nevertheless', 'buna rağmen, yine de'],
      ['Connectors', 'consequently', 'sonuç olarak, dolayısıyla']
    ];
    const cards = pairs.map(([topic, q, a], i) => createCard({ id: `lang-${i + 1}`, topic, question: q, answer: a }));
    cards[0] = reviewCard(cards[0], 'good', hoursBefore(48, ref));
    cards[3] = reviewCard(cards[3], 'again', hoursBefore(25, ref), { reason: 'knowledge-gap' });
    return cards;
  }

  throw new RangeError('unknown sample pack: ' + packId);
}
