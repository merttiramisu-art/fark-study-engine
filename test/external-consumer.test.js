import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('public package self-import example works in a clean Node child process', () => {
  const example = fileURLToPath(new URL('../examples/external-consumer.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [example], {
    encoding: 'utf8',
    timeout: 12_000,
    maxBuffer: 256 * 1024
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const data = JSON.parse(result.stdout);
  assert.equal(data.originalUnchanged, true);
  assert.equal(data.reviewedCardId, 'demo-1');
  assert.deepEqual(data.dueCardIds, ['demo-1']);
  assert.equal(data.totalReviews, 1);
  assert.equal(data.observedAccuracy, 1);
  assert.match(data.disclaimer, /not proof of mastery/);
});
