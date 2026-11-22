import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDemoServer } from '../examples/serve-web.js';

test('Visual Learning assets are accessible only from the local allowlist with offline CSP', async () => {
  const server=createDemoServer();
  server.listen(0,'127.0.0.1');
  try {
    await once(server,'listening');
    const origin='http://127.0.0.1:'+server.address().port;
    for(const [route,contentType] of [
      ['/examples/web/visual-learning.html','text/html'],
      ['/examples/web/visual-learning.js','text/javascript'],
      ['/examples/web/visual-learning.css','text/css'],
      ['/examples/web/visual-learning-samples.js','text/javascript'],
      ['/src/visual-learning.js','text/javascript'],
      ['/src/content-adapter.js','text/javascript'],
      ['/src/markdown-content.js','text/javascript']
    ]) {
      const response=await fetch(origin+route);
      assert.equal(response.status,200,route);
      assert.ok(response.headers.get('content-type').includes(contentType),route);
      assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
      assert.ok((await response.text()).length>200,route);
    }
    const page=await(await fetch(origin+'/examples/web/visual-learning.html')).text();
    assert.match(page,/id="sample-number-line"/);
    assert.match(page,/id="sample-timeline"/);
    assert.match(page,/id="lesson-source"/);
    assert.match(page,/aria-live="polite"/);
    assert.doesNotMatch(page,/https?:\/\/[^" ]+\.(?:js|css)/i);
    const script=await(await fetch(origin+'/examples/web/visual-learning.js')).text();
    assert.match(script,/importMarkdownContentPack/);
    assert.match(script,/importOpenContentPack/);
    assert.match(script,/textContent/);
    assert.doesNotMatch(script,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon)\s*\(/);
    const privateResource=await fetch(origin+'/private-kpss-content');
    assert.equal(privateResource.status,404);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
