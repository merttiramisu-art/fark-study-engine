import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../examples/web/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../examples/web/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../examples/web/styles.css', import.meta.url), 'utf8');

test('study keeps its core reveal, skip and rating controls', () => {
  for (const id of ['question-text', 'answer-panel', 'reveal-button', 'skip-button', 'rating-again', 'rating-hard', 'rating-good', 'rating-easy']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(app, /function revealAnswer\(\)/);
  assert.match(app, /function skipCurrentCard\(\)/);
  assert.match(app, /function rate\(rating\)/);
});

test('study phases and session summary are derived from actual session counters', () => {
  assert.match(html, /id="study-phase-label"/);
  assert.match(html, /id="finish-metrics"/);
  assert.match(app, /\['[^']*Rated', ratedCount\]/);
  assert.match(app, /\['[^']*Skipped', skippedCount\]/);
  assert.match(app, /\['[^']*Processed', position\]/);
});

test('mobile and reduced motion preferences are addressed', () => {
  assert.match(css, /@media \(max-width:430px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});
