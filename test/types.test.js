import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import * as indexMod from '../src/index.js';
import * as plannerMod from '../src/planner.js';
import * as portableMod from '../src/portable.js';
import * as csvMod from '../src/csv.js';
import * as markdownMod from '../src/markdown.js';
import * as strategiesMod from '../src/strategies.js';
import * as interchangeMod from '../src/interchange.js';
import * as widgetMod from '../src/widget.js';
import * as mcpMod from '../src/mcp.js';
import * as memoryMod from '../src/memory.js';
import * as ledgerMod from '../src/ledger.js';
import * as diagnosisMod from '../src/diagnosis.js';
import * as calibrateMod from '../src/calibrate.js';

const MODULE_CHECKS = [
  ['.', indexMod, 'types/index.d.ts'],
  ['./planner', plannerMod, 'types/planner.d.ts'],
  ['./portable', portableMod, 'types/portable.d.ts'],
  ['./csv', csvMod, 'types/csv.d.ts'],
  ['./markdown', markdownMod, 'types/markdown.d.ts'],
  ['./strategies', strategiesMod, 'types/strategies.d.ts'],
  ['./interchange', interchangeMod, 'types/interchange.d.ts'],
  ['./widget', widgetMod, 'types/widget.d.ts'],
  ['./mcp', mcpMod, 'types/mcp.d.ts'],
  ['./memory', memoryMod, 'types/memory.d.ts'],
  ['./ledger', ledgerMod, 'types/ledger.d.ts'],
  ['./diagnosis', diagnosisMod, 'types/diagnosis.d.ts'],
  ['./calibrate', calibrateMod, 'types/calibrate.d.ts']
];

test('every runtime export has a matching TypeScript declaration', async () => {
  for (const [subpath, mod, dtsPath] of MODULE_CHECKS) {
    const dts = await readFile(dtsPath, 'utf8');
    for (const exportName of Object.keys(mod)) {
      const pattern = new RegExp(`export\\s+(?:declare\\s+(?:const|class)|function)\\s+${exportName}\\b`);
      assert.match(dts, pattern, `${subpath} export '${exportName}' missing from ${dtsPath}`);
    }
  }
});

test('package.json exports, types, and bin targets resolve to existing files', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  await access(pkg.types);
  for (const binPath of Object.values(pkg.bin)) {
    await access(binPath);
  }
  for (const entry of Object.values(pkg.exports)) {
    await access(entry.types);
    await access(entry.default);
  }
});

test('all added JavaScript source and CLI files pass node --check', () => {
  for (const file of [
    'src/csv.js',
    'src/markdown.js',
    'src/strategies.js',
    'src/interchange.js',
    'src/widget.js',
    'src/mcp.js',
    'src/memory.js',
    'src/ledger.js',
    'src/diagnosis.js',
    'src/calibrate.js',
    'src/cli.js',
    'bin/fark.js'
  ]) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  }
});
