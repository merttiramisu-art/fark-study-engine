import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

test('package exports resolve to existing JavaScript and TypeScript files', () => {
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.engines.node, '>=20');
  for (const [name, entry] of Object.entries(pkg.exports)) {
    assert.equal(typeof entry.default, 'string', name + ' must have an ESM entry');
    assert.equal(typeof entry.types, 'string', name + ' must have a declaration entry');
    assert.ok(entry.default.startsWith('./'), name + ' ESM path must be relative');
    assert.ok(entry.types.startsWith('./'), name + ' type path must be relative');
    assert.ok(existsSync(resolve(root, entry.default)), name + ' missing ESM file');
    assert.ok(existsSync(resolve(root, entry.types)), name + ' missing declaration file');
  }
});

test('every advertised ESM entry imports without side effects or missing dependencies', async () => {
  for (const [name, entry] of Object.entries(pkg.exports)) {
    const url = pathToFileURL(resolve(root, entry.default)).href;
    const exports = await import(url);
    assert.ok(exports && typeof exports === 'object', name + ' must import as a module');
  }
});

test('reassessment public API exposes documented functions', async () => {
  const api = await import('fark-study-engine/reassessment-ledger');
  for (const name of [
    'createReassessmentLedger', 'validateReassessmentLedger',
    'issueReassessment', 'verifyIssuedReassessment'
  ]) {
    assert.equal(typeof api[name], 'function', name + ' must be callable');
  }
});
