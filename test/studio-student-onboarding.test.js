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
  assert.match(js, /Her seferinde bir soru/);
  assert.match(js, /One question at a time/);
  assert.match(css, /@media \(max-width: 650px\)/);
});
