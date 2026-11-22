import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDemoServer } from '../examples/serve-web.js';

test('Visual Math Lab is served locally under restrictive CSP with no network resources', async () => {
  const server = createDemoServer();
  server.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const origin = 'http://127.0.0.1:' + server.address().port;
    for (const [path,type] of [
      ['/examples/web/visual-math.html','text/html'],
      ['/examples/web/visual-math.js','text/javascript'],
      ['/examples/web/visual-math.css','text/css'],
      ['/src/visual-math.js','text/javascript'],
      ['/src/content-adapter.js','text/javascript'],
      ['/src/markdown-content.js','text/javascript']
    ]) {
      const response = await fetch(origin+path);
      assert.equal(response.status, 200, path);
      assert.ok(response.headers.get('content-type').includes(type), path);
      assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
      assert.ok((await response.text()).length > 200);
    }
    const html = await (await fetch(origin + '/examples/web/visual-math.html')).text();
    assert.match(html, /id="left-bar"/);
    assert.match(html, /id="right-bar"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /id="content-source"/);
    assert.match(html, /id="load-visual-content"/);
    assert.match(html, /id="authored-preview"/);
    assert.doesNotMatch(html, /https?:\/\/[^" ]+\.(?:js|css)/i);
    const js = await (await fetch(origin + '/examples/web/visual-math.js')).text();
    assert.match(js, /compareFractionModels/);
    assert.match(js, /renderOptionalKatex/);
    assert.match(js, /importMarkdownContentPack/);
    assert.match(js, /importOpenContentPack/);
    assert.match(js, /authored-body'\)\.textContent/);
    assert.doesNotMatch(js, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\s*\(/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
