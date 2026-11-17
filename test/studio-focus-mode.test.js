import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../examples/web/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../examples/web/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../examples/web/app.js', import.meta.url), 'utf8');

test('focus view has an accessible reversible control', () => {
  assert.match(html, /id="view-mode-toggle"[^>]*type="button"[^>]*aria-pressed="true"/);
  assert.match(app, /focusMode = !focusMode/);
  assert.match(app, /setAttribute\('aria-pressed', String\(focusMode\)\)/);
});

test('focus mode hides settings only inside the study panel', () => {
  assert.match(css, /body\.focus-mode #panel-study #settings-form/);
  assert.doesNotMatch(css, /body\.focus-mode #panel-decks/);
  assert.doesNotMatch(css, /body\.focus-mode #panel-simulator/);
});

test('focus view labels support English and Turkish', () => {
  assert.match(app, /Gelişmiş ayarları göster/);
  assert.match(app, /Show advanced controls/);
});
