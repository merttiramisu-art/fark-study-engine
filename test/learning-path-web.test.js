import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDemoServer } from '../examples/serve-web.js';

test('V6 Learning Journey serves each local-only asset and engine dependency', async () => {
  const server = createDemoServer();
  server.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const assets = [
      ['/examples/web/learning-path.html', 'text/html'],
      ['/examples/web/learning-path.js', 'text/javascript'],
      ['/examples/web/learning-path.css', 'text/css'],
      ['/src/assessment.js', 'text/javascript'],
      ['/src/knowledge-core.js', 'text/javascript'],
      ['/src/learning-orchestrator.js', 'text/javascript'],
      ['/src/learning-loop.js', 'text/javascript'],
      ['/src/learning-progress.js', 'text/javascript'],
      ['/src/prerequisite-analysis.js', 'text/javascript'],
      ['/src/reassessment-ledger.js', 'text/javascript']
    ];
    for (const [path, type] of assets) {
      const result = await fetch(base + path);
      assert.equal(result.status, 200, path);
      assert.match(result.headers.get('content-type'), new RegExp(type), path);
      assert.match(result.headers.get('content-security-policy'), /connect-src 'none'/, path);
      assert.ok((await result.text()).length > 100, path);
    }
    const html = await (await fetch(base + '/examples/web/learning-path.html')).text();
    assert.match(html, /No learner data saved/);
    assert.match(html, /journey-status/);
    const script = await (await fetch(base + '/examples/web/learning-path.js')).text();
    for (const name of ['recordAssessment', 'recordTeachingCompletion', 'issueReassessment', 'verifyIssuedReassessment']) {
      assert.match(script, new RegExp(name));
    }
    assert.doesNotMatch(script, /\b(?:localStorage|sessionStorage|indexedDB|sendBeacon)\b/);
    const notFound = await fetch(base + '/private-course.txt');
    assert.equal(notFound.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
