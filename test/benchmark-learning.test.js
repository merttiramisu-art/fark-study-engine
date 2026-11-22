import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/benchmark-learning.mjs', import.meta.url));

function execute() {
  const result = spawnSync(process.execPath, [script, '--sizes=1000,100000', '--runs=1', '--seed=42'], {
    encoding: 'utf8',
    timeout: 20000,
    maxBuffer: 1024 * 1024
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('V6.1 reports reproducible synthetic benchmark metadata without fabricated 100k result', () => {
  const a = execute();
  const b = execute();
  assert.equal(a.synthetic, true);
  assert.equal(a.seed, 42);
  assert.equal(a.node, process.version);
  assert.equal(a.results.length, 2);
  const [supported, unsupported] = a.results;
  assert.equal(supported.events, 1000);
  assert.equal(supported.status, 'measured');
  assert.equal(supported.runs, 1);
  assert.equal(supported.fixtureSha256, b.results[0].fixtureSha256);
  assert.match(supported.fixtureSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(supported.sampleCountByStrategy.map(x => x.strategy), ['balanced', 'sm2', 'dsr']);
  assert.ok(Number.isFinite(supported.medianMs) && supported.medianMs >= 0);
  assert.equal(unsupported.events, 100000);
  assert.equal(unsupported.status, 'unsupported');
  assert.equal(unsupported.limit, 50000);
  assert.ok(!Object.hasOwn(unsupported, 'medianMs'));
});

test('V6.1 rejects unknown benchmark settings and avoids a fake measurement', () => {
  const result = spawnSync(process.execPath, [script, '--sizes=1000000'], {
    encoding: 'utf8', timeout: 12000
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /size|sizes/i);
});
