import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDemoServer } from '../examples/serve-web.js';

test('Study Desk serves local-only lessons, visual models, concepts and learning APIs', async()=>{
  const server=createDemoServer();
  server.listen(0,'127.0.0.1');
  try {
    await once(server,'listening');
    const origin='http://127.0.0.1:'+server.address().port;
    for(const [path,mime] of [
      ['/examples/web/study-desk.html','text/html'],
      ['/examples/web/study-desk.js','text/javascript'],
      ['/examples/web/study-desk.css','text/css'],
      ['/examples/web/study-desk-sample.js','text/javascript'],
      ['/examples/web/visual-learning-samples.js','text/javascript'],
      ['/src/study-desk.js','text/javascript'],
      ['/src/concept-study-path.js','text/javascript'],
      ['/src/reassessment-ledger.js','text/javascript'],
      ['/src/visual-math.js','text/javascript'],
      ['/src/visual-learning.js','text/javascript'],
      ['/src/content-adapter.js','text/javascript'],
      ['/src/markdown-content.js','text/javascript']
    ]) {
      const response=await fetch(origin+path);
      assert.equal(response.status,200,path);
      assert.ok(response.headers.get('content-type').includes(mime),path);
      assert.match(response.headers.get('content-security-policy'),/connect-src 'none'/);
      assert.ok((await response.text()).length>200,path);
    }
    const html=await(await fetch(origin+'/examples/web/study-desk.html')).text();
    for(const id of ['topic-list','lesson-visual','practice-options','path-reason','path-prereqs',
      'review-lesson','issue-different','clear-session','desk-source','load-desk-source','source-error']) {
      assert.ok(html.includes('id="'+id+'"'),id);
    }
    assert.match(html,/aria-live="polite"/);
    assert.doesNotMatch(html,/https?:\/\/[^" ]+\.(?:js|css)/i);
    const script=await(await fetch(origin+'/examples/web/study-desk.js')).text();
    for(const name of ['buildStudyDeskView','recordAssessment','recordTeachingCompletion',
      'issueReassessment','verifyIssuedReassessment','importMarkdownContentPack']) {
      assert.ok(script.includes(name),name);
    }
    assert.doesNotMatch(script,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon)\s*\(/);
    assert.doesNotMatch(script,/\.innerHTML\s*=/);
    assert.equal((await fetch(origin+'/private-kpss')).status,404);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
