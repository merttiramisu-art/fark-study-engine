import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../src/index.js';
import { exportStudyCsv, importStudyCsv } from '../src/csv.js';

test('CSV round trip preserves commas, quotes and multiline content', () => {
  const cards = [createCard({
    id: 'csv-1',
    topic: 'English, grammar',
    question: 'What does "hello" mean?\nExplain.',
    answer: 'A greeting, often "informal".'
  })];
  const imported = importStudyCsv(exportStudyCsv(cards));
  assert.deepEqual(imported.map(({ id, topic, question, answer }) => ({ id, topic, question, answer })),
    cards.map(({ id, topic, question, answer }) => ({ id, topic, question, answer })));
});

test('spreadsheet-safe CSV export prefixes dangerous formulas', () => {
  const cards = [createCard({
    id: 'csv-formula',
    topic: '=SUM(1,2)',
    question: '+CMD',
    answer: '@unsafe'
  })];
  const safe = exportStudyCsv(cards, { escapeFormulas: true });
  assert.match(safe, /'=SUM\(1,2\)/);
  assert.match(safe, /'\+CMD/);
  assert.match(safe, /'@unsafe/);
  const unsafe = exportStudyCsv(cards);
  assert.doesNotMatch(unsafe, /'=SUM/);
});

test('CSV import rejects duplicate headers and missing required columns', () => {
  assert.throws(() => importStudyCsv('topic,topic,question,answer\na,b,c,d'), /duplicate CSV column/);
  assert.throws(() => importStudyCsv('topic,question\na,b'), /missing required column/);
});

test('CSV import rejects malformed quoting and mismatched row widths', () => {
  assert.throws(() => importStudyCsv('topic,question,answer\n"unclosed,x,y'), /unterminated quoted/);
  assert.throws(() => importStudyCsv('topic,question,answer\na,b'), /expected 3 columns/);
  assert.throws(() => importStudyCsv('topic,question,answer\n"a"x,b,c'), /unexpected character after closing quote/);
});

test('CSV import accepts UTF-8 BOM and generates deterministic IDs', () => {
  const cards = importStudyCsv('\uFEFFtopic,question,answer\nMath,2+2,4', { idPrefix: 'lesson' });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].id, 'lesson-0001');
});
