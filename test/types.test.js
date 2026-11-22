import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

test('all public package subpaths have matching runtime and TypeScript value exports', async () => {
  for (const [subpath, entry] of Object.entries(packageJson.exports)) {
    assert.equal(typeof entry.default, 'string', subpath + ' needs runtime path');
    assert.equal(typeof entry.types, 'string', subpath + ' needs declaration path');
    const specifier = packageJson.name + (subpath === '.' ? '' : subpath.slice(1));
    const mod = await import(specifier); // Resolves through the public package exports map.
    const dts = await readFile(new URL('../' + entry.types.replace(/^\.\//, ''), import.meta.url), 'utf8');

    for (const exportName of Object.keys(mod)) {
      const escaped = exportName;
      const direct = new RegExp('\\bexport\\s+(?:declare\\s+)?(?:async\\s+)?(?:function|const|class|let|var)\\s+' + escaped + '\\b');
      const named = new RegExp('\\bexport\\s*\\{[^}]*\\b' + escaped + '\\b[^}]*\\}');
      assert.ok(direct.test(dts) || named.test(dts), specifier + ' export ' + exportName + ' missing in ' + entry.types);
    }
  }
});

test('package.json exports, declaration paths, and bin targets resolve to existing files', async () => {
  await access(packageJson.types);
  for (const binPath of Object.values(packageJson.bin)) await access(binPath);
  for (const entry of Object.values(packageJson.exports)) {
    await access(entry.types);
    await access(entry.default);
  }
});

test('every public runtime entry and CLI script passes Node syntax validation', () => {
  const files = new Set(['src/cli.js', 'bin/fark.js']);
  for (const entry of Object.values(packageJson.exports)) files.add(entry.default);
  for (const path of files) {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    assert.equal(result.status, 0, path + ': ' + result.stderr);
  }
});
