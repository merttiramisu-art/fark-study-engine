import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('public Markdown content sample runs offline in its own Node process', () => {
  const file = fileURLToPath(new URL('../examples/markdown-content-demo.js', import.meta.url));
  const result = spawnSync(process.execPath, [file], {
    encoding: 'utf8', timeout: 12000, maxBuffer: 256 * 1024
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.equal(output.sourceFormat, 'FARK Markdown Content Pack v1');
  assert.equal(output.attribution.license, 'MIT');
  assert.equal(output.totalQuestions, 2);
  assert.equal(output.observedCorrect, false);
  assert.equal(output.nextStatus, 'teaching-needed');
  assert.equal(output.suggestedLesson, 'Same whole, different-sized pieces');
  assert.equal(output.mastery, null);
});
