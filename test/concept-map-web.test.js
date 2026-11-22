import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDemoServer } from '../examples/serve-web.js';

test('Concept Map browser app is fully local, safe-text and CSP-restricted', async () => {
  const server=createDemoServer();
  server.listen(0,'127.0.0.1');
  try {
    await once(server,'listening');
    const origin='http://127.0.0.1:'+server.address().port;
    for(const [path,type] of [
      ['/examples/web/concept-map.html','text/html'],
      ['/examples/web/concept-map.js','text/javascript'],
      ['/examples/web/concept-map.css','text/css'],
      ['/examples/web/concept-map-sample.js','text/javascript'],
      ['/src/concept-map.js','text/javascript'],
      ['/src/assessment.js','text/javascript'],
      ['/src/knowledge-core.js','text/javascript']
    ]) {
      const result=await fetch(origin+path);
      assert.equal(result.status,200,path);
      assert.ok(result.headers.get('content-type').includes(type),path);
      assert.match(result.headers.get('content-security-policy'),/connect-src 'none'/);
      assert.ok((await result.text()).length>200,path);
    }
    const html=await(await fetch(origin+'/examples/web/concept-map.html')).text();
    assert.match(html,/id="map-levels"/);
    assert.match(html,/id="question-select"/);
    assert.match(html,/id="quiz-feedback"/);
    assert.match(html,/id="reset-evidence"/);
    assert.match(html,/aria-live="polite"/);
    const js=await(await fetch(origin+'/examples/web/concept-map.js')).text();
    assert.match(js,/recordAssessment/);
    assert.match(js,/buildConceptMap/);
    assert.match(js,/textContent/);
    assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon)\s*\(/);
    assert.doesNotMatch(js,/\.innerHTML\s*=/);
    const noPrivate=await fetch(origin+'/private-kpss');
    assert.equal(noPrivate.status,404);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
