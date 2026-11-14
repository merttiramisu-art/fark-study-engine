import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, validateDeck } from '../src/index.js';
import {
  SAMPLE_PACKS,
  parseClozePrompt,
  reverseCardPrompt,
  exportStudyTsv,
  importStudyTsv,
  buildSamplePack,
  buildConceptNodesForCards
} from '../src/interchange.js';

const NOW = '2026-11-13T12:00:00.000Z';

test('parseClozePrompt extracts inline {{...}}, {{c1::...::hint}}, and [[...]] blanks cleanly', () => {
  const plain = parseClozePrompt('Capital of Japan?', 'Tokyo');
  assert.equal(plain.isCloze, false);
  assert.equal(plain.maskedQuestion, 'Capital of Japan?');
  assert.equal(plain.revealedText, 'Tokyo');

  const multi = parseClozePrompt('The {{c1::mitochondrion::organelle}} produces {{ATP}} via [[oxidative phosphorylation]].');
  assert.equal(multi.isCloze, true);
  assert.deepEqual(multi.targets, ['mitochondrion', 'ATP', 'oxidative phosphorylation']);
  assert.deepEqual(multi.hints, ['organelle']);
  assert.equal(multi.maskedQuestion, 'The [ ___ (organelle) ] produces [ ___ ] via [ ___ ].');
  assert.equal(multi.revealedText, 'The mitochondrion produces ATP via oxidative phosphorylation.');
});

test('reverseCardPrompt returns non-mutating swapped prompt projection', () => {
  const card = createCard({ id: 'v1', topic: 'Lang', question: 'resilient', answer: 'dayanıklı' });
  const snapshot = structuredClone(card);
  const rev = reverseCardPrompt(card);
  assert.equal(rev.question, 'dayanıklı');
  assert.equal(rev.answer, 'resilient');
  assert.equal(rev.isReversed, true);
  assert.deepEqual(card, snapshot);
});

test('TSV export and import round-trip cleanly including Anki #deck: directives', () => {
  const deck = [
    createCard({ id: 't1', topic: 'Algorithms', question: 'Binary search complexity?', answer: 'O(log n)' }),
    createCard({ id: 't2', topic: 'Systems', question: 'HTTP\tidempotent\tverb?', answer: 'PUT' })
  ];
  const tsv = exportStudyTsv(deck);
  assert.match(tsv, /^topic\tquestion\tanswer\n/);
  const imported = importStudyTsv(tsv, { idPrefix: 'round' });
  assert.equal(imported.length, 2);
  assert.equal(imported[0].topic, 'Algorithms');
  assert.equal(imported[0].question, 'Binary search complexity?');
  assert.equal(imported[1].question, 'HTTP idempotent verb?');

  const ankiStyle = [
    '#separator:tab',
    '#deck:Anatomi',
    'Front line 1\tBack line 1',
    'Front line 2\tBack line 2'
  ].join('\n');
  const ankiCards = importStudyTsv(ankiStyle);
  assert.equal(ankiCards.length, 2);
  assert.equal(ankiCards[0].topic, 'Anatomi');
  assert.equal(ankiCards[0].question, 'Front line 1');

  assert.throws(() => importStudyTsv('#comment only'), RangeError);
  assert.throws(() => importStudyTsv('only-one-column'), RangeError);
  assert.throws(() => exportStudyTsv(deck, { unknownOpt: true }), RangeError);
});

test('curated sample packs build valid non-empty decks with metadata', () => {
  assert.equal(SAMPLE_PACKS.length, 5);
  for (const meta of SAMPLE_PACKS) {
    const cards = buildSamplePack(meta.id, NOW);
    assert.ok(cards.length >= 7, `${meta.id} should have at least 7 cards`);
    assert.equal(validateDeck(cards), true);
  }
  const english = buildSamplePack('english', NOW);
  const concepts = buildConceptNodesForCards(english);
  const condNode = concepts.find(c => c.id === 'English: Conditionals & Passive');
  assert.deepEqual(condNode?.prerequisites, ['English: Tenses']);
  assert.throws(() => buildSamplePack('nonexistent', NOW), RangeError);
});
