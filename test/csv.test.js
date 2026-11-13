import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard } from '../src/index.js';
import { exportStudyCsv, importStudyCsv } from '../src/csv.js';

test('CSV round-trip preserves commas, quotes, newlines, and Turkish characters', () => {
  const cards = [
    createCard({
      id: 'tr-01',
      topic: 'Dil Bilgisi, Yazım',
      question: '“Öğrenci” kelimesinde hangi ünlü uyumu vardır?\nAçıklayın.',
      answer: '"Büyük ünlü uyumu" vardır, çünkü kalın ünlülerle başlar.'
    }),
    createCard({
      id: 'math-01',
      topic: 'Mathematics',
      question: '-5 + 3 = ?',
      answer: '-2'
    })
  ];

  const csv = exportStudyCsv(cards);
  const imported = importStudyCsv(csv);
  assert.deepEqual(imported, cards);
});

test('empty deck CSV round-trip produces empty array', () => {
  const csv = exportStudyCsv([]);
  assert.equal(csv, 'id,topic,question,answer');
  assert.deepEqual(importStudyCsv(csv), []);
});

test('imports 3-column CSV without id column and strips UTF-8 BOM + CRLF', () => {
  const csv = '\uFEFFtopic,question,answer\r\nBiology,What is ATP?,Energy currency\r\nMath,"1,000 + 2",1002\r\n';
  const cards = importStudyCsv(csv, { idPrefix: 'bio' });
  assert.equal(cards.length, 2);
  assert.equal(cards[0].id, 'bio-0001');
  assert.equal(cards[1].id, 'bio-0002');
  assert.equal(cards[1].question, '1,000 + 2');
  assert.equal(cards[0].reviews, 0);
});

test('escapeFormulas prefixes dangerous spreadsheet formula characters when enabled', () => {
  const cards = [
    createCard({ id: 'f-1', topic: 'Math', question: '=1+1', answer: '+2' }),
    createCard({ id: 'f-2', topic: 'Notes', question: '@mention', answer: '-dash' })
  ];
  const safeCsv = exportStudyCsv(cards, { escapeFormulas: true });
  const parsed = importStudyCsv(safeCsv);
  assert.equal(parsed[0].question, "'=1+1");
  assert.equal(parsed[0].answer, "'+2");
  assert.equal(parsed[1].question, "'@mention");
  assert.equal(parsed[1].answer, "'-dash");
});

test('rejects malformed quotes, unknown columns, mismatched rows, and duplicates', () => {
  assert.throws(() => importStudyCsv(''), /empty/);
  assert.throws(() => importStudyCsv('   \r\n  '), /empty/);
  assert.throws(() => importStudyCsv('topic,question,answer\nMath,"unclosed,5'), SyntaxError);
  assert.throws(() => importStudyCsv('topic,question,answer\nMath,"bad"x,5'), SyntaxError);
  assert.throws(() => importStudyCsv('topic,question,answer\nMath,a"b,5'), SyntaxError);
  assert.throws(() => importStudyCsv('topic,question,answer,extra\nMath,2+2,4,x'), /unknown CSV column/);
  assert.throws(() => importStudyCsv('topic,question\nMath,2+2'), /missing required column/);
  assert.throws(() => importStudyCsv('topic,topic,question,answer\nA,B,Q,A'), /duplicate CSV column/);
  assert.throws(() => importStudyCsv('topic,question,answer\nMath,2+2'), /expected 3 columns/);
  assert.throws(() => importStudyCsv('id,topic,question,answer\na,Math,Q1,A1\na,Math,Q2,A2'), /duplicate card id/);
});

test('validates options and size bounds', () => {
  const card = reviewCard(createCard({ id: 'a', topic: 'Math', question: '1+1?', answer: '2' }), 'good', '2026-11-13T12:00:00Z');
  assert.throws(() => exportStudyCsv([card], { unknown: true }), /unknown CSV option/);
  assert.throws(() => exportStudyCsv([card], { escapeFormulas: 'yes' }), TypeError);
  assert.throws(() => importStudyCsv('topic,question,answer\nA,B,C', { idPrefix: '   ' }), TypeError);
  assert.throws(() => importStudyCsv(' '.repeat(2_000_001)), /exceeds/);
  assert.throws(() => exportStudyCsv(Array.from({ length: 10_001 }, (_, i) => createCard({ id: String(i), topic: 'T', question: 'Q', answer: 'A' }))), /exceeds/);
});
