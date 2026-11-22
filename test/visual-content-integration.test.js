import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importOpenContentPack } from '../src/content-adapter.js';
import { importMarkdownContentPack } from '../src/markdown-content.js';
import { compareFractionModels } from '../src/visual-math.js';

const json = JSON.parse(readFileSync(fileURLToPath(
  new URL('../examples/content-packs/original-fractions.json', import.meta.url)), 'utf8'));
const markdown = readFileSync(fileURLToPath(
  new URL('../examples/content-packs/original-fractions.md', import.meta.url)), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));

test('author Markdown and JSON retain identical validated optional visual metadata', () => {
  const source = JSON.stringify(json);
  const fromJson = importOpenContentPack(json);
  const fromMarkdown = importMarkdownContentPack(markdown);
  assert.deepEqual(fromMarkdown, fromJson);
  const visual = fromJson.materials.lessons[0].visual;
  assert.deepEqual(visual, { kind:'fraction-comparison',
    left:{numerator:1,denominator:3}, right:{numerator:1,denominator:4} });
  assert.equal(compareFractionModels(visual.left, visual.right).label, '1/3 > 1/4');
  assert.equal(JSON.stringify(json), source);
  visual.left.numerator = 0;
  assert.equal(json.lessons[0].visual.left.numerator, 1);
});

test('legacy JSON and Markdown packs without visual metadata still import unchanged', () => {
  const oldJson = clone(json);
  delete oldJson.lessons[0].visual;
  const oldMarkdown = markdown.replace('visualLeft: 1/3\nvisualRight: 1/4\n', '');
  const a = importOpenContentPack(oldJson);
  const b = importMarkdownContentPack(oldMarkdown);
  assert.deepEqual(a,b);
  assert.equal(Object.hasOwn(a.materials.lessons[0], 'visual'), false);
});

test('visual declarations fail closed on invalid bounds, unknown renderer types and extra instructions', () => {
  const bad = [
    { kind:'fraction-comparison',left:{numerator:1,denominator:0},right:{numerator:1,denominator:4} },
    { kind:'fraction-comparison',left:{numerator:5,denominator:4},right:{numerator:1,denominator:4} },
    { kind:'fraction-comparison',left:{numerator:1,denominator:13},right:{numerator:1,denominator:4} },
    { kind:'fraction-comparison',left:{numerator:'1',denominator:3},right:{numerator:1,denominator:4} },
    { kind:'svg',left:{numerator:1,denominator:3},right:{numerator:1,denominator:4} },
    { kind:'fraction-comparison',left:{numerator:1,denominator:3,onclick:'alert(1)'},right:{numerator:1,denominator:4} },
    { kind:'fraction-comparison',left:{numerator:1,denominator:3},right:{numerator:1,denominator:4},script:'alert(1)' }
  ];
  for (const visual of bad) {
    const pack = clone(json);
    pack.lessons[0].visual = visual;
    assert.throws(() => importOpenContentPack(pack));
  }
});

test('Markdown visual fields must occur together and parse strictly before lesson body', () => {
  assert.throws(
    () => importMarkdownContentPack(markdown.replace('visualRight: 1/4\n','')),
    /both be provided/i);
  assert.throws(
    () => importMarkdownContentPack(markdown.replace('visualLeft: 1/3','visualLeft: 1/0')),
    /denominator/i);
  assert.throws(
    () => importMarkdownContentPack(markdown.replace('visualLeft: 1/3','visualLeft: 2/1')),
    /numerator/i);
  assert.throws(
    () => importMarkdownContentPack(markdown.replace('visualLeft: 1/3','visualLeft: \${evil}')),
    /fraction/i);
  const inBody = markdown.replace('visualLeft: 1/3\nvisualRight: 1/4\n','')
    .replace('### Body\n','### Body\nvisualLeft: 1/3\nvisualRight: 1/4\n');
  const result = importMarkdownContentPack(inBody);
  assert.equal(Object.hasOwn(result.materials.lessons[0], 'visual'), false);
  assert.match(result.materials.lessons[0].bodyText, /visualLeft: 1\/3/);
});
