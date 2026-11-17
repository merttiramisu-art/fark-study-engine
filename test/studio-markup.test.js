import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../examples/web/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../examples/web/styles.css', import.meta.url), 'utf8');

test('Studio offers a keyboard skip link to its main landmark', () => {
  assert.match(html, /class="skip-link" href="#studio-main"/);
  assert.match(html, /<main id="studio-main" tabindex="-1">/);
  assert.match(css, /\.skip-link:focus\s*\{[^}]*translateY\(0\)/);
});

test('Studio respects reduced-motion preferences', () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('Studio preserves all four labeled tab panels', () => {
  for (const name of ['study', 'simulator', 'decks', 'intelligence']) {
    assert.match(html, new RegExp('id="tab-' + name + '"[^>]*role="tab"'));
    assert.match(html, new RegExp('id="panel-' + name + '"[^>]*role="tabpanel"'));
  }
});
