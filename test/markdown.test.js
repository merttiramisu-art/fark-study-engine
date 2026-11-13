import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard, validateDeck } from '../src/index.js';
import { exportStudyMarkdown, importStudyMarkdown } from '../src/markdown.js';

const NOW = '2026-11-13T12:00:00.000Z';

test('exports grouped Markdown study sheets with optional stats and collapsible answers', () => {
  const cards = [
    createCard({ id: 'z1', topic: 'Zoology', question: 'Largest mammal?', answer: 'Blue whale' }),
    reviewCard(createCard({ id: 'a1', topic: 'Astronomy', question: 'Closest star?', answer: 'Proxima Centauri' }), 'good', NOW)
  ];

  const plain = exportStudyMarkdown(cards, { title: 'Weekend Review' });
  assert.match(plain, /^# Weekend Review/);
  assert.ok(plain.indexOf('## Astronomy') < plain.indexOf('## Zoology'));
  assert.match(plain, /- \*\*Q:\*\* Closest star\?\r?\n  - \*\*A:\*\* Proxima Centauri/);
  assert.doesNotMatch(plain, /Self-reported history/);

  const detailed = exportStudyMarkdown(cards, { includeStats: true, collapsibleAnswers: true });
  assert.match(detailed, /<details><summary>Show answer<\/summary>Blue whale<\/details>/);
  assert.match(detailed, /Self-reported history: box 1/);
  assert.match(detailed, /Self-reported status: unreviewed/);
});

test('round-trips both plain and collapsible Markdown study sheets cleanly', () => {
  const cards = [
    createCard({ id: 'c1', topic: 'Physics', question: 'SI unit of force?', answer: 'Newton (N)' }),
    createCard({ id: 'c2', topic: 'Physics', question: 'Speed of light approx?', answer: '300,000 km/s' }),
    createCard({ id: 'c3', topic: 'History', question: 'Year of Apollo 11?', answer: '1969' })
  ];

  for (const collapsibleAnswers of [false, true]) {
    const md = exportStudyMarkdown(cards, { collapsibleAnswers, includeStats: true });
    const imported = importStudyMarkdown(md, { idPrefix: 'round' });
    assert.equal(validateDeck(imported), true);
    assert.equal(imported.length, 3);
    assert.equal(imported[0].topic, 'History');
    assert.equal(imported[0].question, 'Year of Apollo 11?');
    assert.equal(imported[0].answer, '1969');
    assert.equal(imported[1].topic, 'Physics');
    assert.ok(imported[0].id.startsWith('round-1-'));
  }
});

test('imports hand-written Markdown headings, Q::A bullets, and Q:/A: blocks', () => {
  const raw = [
    '## Algorithms',
    '- Binary search precondition :: Sorted monotonic array',
    '* QuickSelect average complexity :: O(n)',
    '',
    '### Networking',
    'Q: Default HTTPS port?',
    'A: 443'
  ].join('\n');

  const cards = importStudyMarkdown(raw, { defaultTopic: 'Misc' });
  assert.equal(cards.length, 3);
  assert.deepEqual(
    cards.map(c => [c.topic, c.question, c.answer]),
    [
      ['Algorithms', 'Binary search precondition', 'Sorted monotonic array'],
      ['Algorithms', 'QuickSelect average complexity', 'O(n)'],
      ['Networking', 'Default HTTPS port?', '443']
    ]
  );
});

test('rejects invalid Markdown inputs and unknown options cleanly', () => {
  const sample = [createCard({ id: '1', topic: 'Math', question: '1+1?', answer: '2' })];
  assert.throws(() => exportStudyMarkdown(sample, { unknownOpt: true }), RangeError);
  assert.throws(() => exportStudyMarkdown(sample, { title: '   ' }), RangeError);
  assert.throws(() => importStudyMarkdown(123), TypeError);
  assert.throws(() => importStudyMarkdown(''), RangeError);
  assert.throws(() => importStudyMarkdown('# Only heading\nNo Q/A pairs here.'), RangeError);
  assert.throws(() => importStudyMarkdown('- **Q:** Missing answer\n## Next Topic'), RangeError);
  assert.throws(() => importStudyMarkdown('- **A:** Orphan answer'), RangeError);
  assert.throws(() => importStudyMarkdown('## Topic\n- Broken :: '), RangeError);
});
