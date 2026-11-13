import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createDemoServer } from '../examples/serve-web.js';

function nodeCheck(path) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

test('browser app and demo server parse as valid modern JavaScript', () => {
  nodeCheck('examples/web/app.js');
  nodeCheck('examples/serve-web.js');
  nodeCheck('src/index.js');
  nodeCheck('src/planner.js');
  nodeCheck('src/portable.js');
});

test('all browser app element references exist in the HTML', async () => {
  const html = await readFile('examples/web/index.html', 'utf8');
  const js = await readFile('examples/web/app.js', 'utf8');
  const ids = [...js.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  assert.ok(ids.length >= 20, 'the UI should reference a meaningful number of controls');
  const missing = [...new Set(ids)].filter(id => !html.includes('id="' + id + '"'));
  assert.deepEqual(missing, [], 'all JS element references must exist');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /id="import-trigger"/);
  assert.match(html, /role="progressbar"/);
});

test('demo only imports local engine modules and no external dependencies', async () => {
  const html = await readFile('examples/web/index.html', 'utf8');
  const js = await readFile('examples/web/app.js', 'utf8');
  const css = await readFile('examples/web/styles.css', 'utf8');
  assert.doesNotMatch(html, /src="https?:\/\//);
  assert.doesNotMatch(js, /(?:fetch\(|XMLHttpRequest|sendBeacon|https?:\/\/)/);
  assert.doesNotMatch(css, /@import|url\(https?:\/\//);
  assert.match(js, /planStudySession\(/);
  assert.match(js, /reviewCard\(/);
  assert.match(js, /createCard\(/);
  assert.match(js, /getReviewForecast\(/);
  assert.match(js, /getMistakeBreakdown\(/);
  assert.match(js, /exportStudyDeck\(/);
  assert.match(js, /importStudyDeck\(/);
  assert.match(js, /exportStudyCsv\(/);
  assert.match(js, /importStudyCsv\(/);
});

test('local demo server routes only allowlisted assets with restrictive headers', async t => {
  const server = createDemoServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = 'http://127.0.0.1:' + server.address().port;

  const root = await fetch(base + '/', { redirect: 'manual' });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), '/examples/web/');

  const assets = [
    ['/examples/web/', 'text/html', '<title>FARK Study Engine'],
    ['/examples/web/styles.css', 'text/css', '.site-shell'],
    ['/examples/web/app.js', 'text/javascript', 'planStudySession'],
    ['/src/index.js', 'text/javascript', 'export function reviewCard'],
    ['/src/planner.js', 'text/javascript', 'export function planStudySession'],
    ['/src/portable.js', 'text/javascript', 'export function importStudyDeck'],
    ['/src/csv.js', 'text/javascript', 'export function exportStudyCsv']
  ];
  for (const [path, type, expected] of assets) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), new RegExp(type), path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
    assert.ok((await response.text()).includes(expected), path);
  }

  const missing = await fetch(base + '/secrets.env');
  assert.equal(missing.status, 404);
  const traversal = await fetch(base + '/src/../package.json');
  assert.equal(traversal.status, 404);
  const wrongMethod = await fetch(base + '/', { method: 'POST' });
  assert.equal(wrongMethod.status, 405);
});

test('HTTP HEAD returns headers without a body', async t => {
  const server = createDemoServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch('http://127.0.0.1:' + server.address().port + '/examples/web/', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});
