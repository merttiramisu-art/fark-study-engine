import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../examples/web/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../examples/web/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../examples/web/styles.css', import.meta.url), 'utf8');

test('student entry point is a button, not a dead link', () => {
  assert.match(html, /id="start-learning-button" type="button"/);
  assert.match(js, /\$\('start-learning-button'\)\.addEventListener\('click'/);
  assert.match(js, /switchTab\('study'\)/);
});

test('study entry moves keyboard focus to the question', () => {
  assert.match(html, /id="question-text" tabindex="-1"/);
  assert.match(js, /question\.focus\(\{ preventScroll: true \}\)/);
});

test('welcome supports Turkish and English', () => {
  assert.match(js, /Bugün bir adım at/);
  assert.match(js, /Make today count/);
  assert.match(css, /@media \(max-width: 650px\)/);
});

test('V2 landing preserves student actions and all four feature tabs', () => {
  assert.match(html, /class="intro compact-intro v2-home"/);
  assert.match(html, /id="home-library-button" type="button"/);
  assert.match(js, /\$\('home-library-button'\)\.addEventListener\('click'/);
  for (const tab of ['study', 'decks', 'intelligence', 'simulator']) {
    assert.match(html, new RegExp('id="tab-' + tab + '"'));
  }
});
