import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = path => readFileSync(new URL(path, import.meta.url),'utf8');

test('lesson designer provides accessible fields for content, learning outcome, lesson and answers',()=>{
  const html=source('../examples/web/lesson-designer.html');
  for(const id of ['designer-form','pack-title','creator','license','unit','outcome','lesson-title','lesson-body','visual-kind','q1-prompt','q1-correct','second-question','download','preview-content','designer-error']) {
    assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
  }
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/lang="tr"/);
  assert.doesNotMatch(html,/<script[^>]+https?:\/\//i);
  assert.doesNotMatch(html,/<link[^>]+https?:\/\//i);
});

test('preview/export are gated by the canonical content adapter without storage or unsafe HTML',()=>{
  const script=source('../examples/web/lesson-designer.js');
  assert.match(script,/importOpenContentPack\(pack\)/);
  assert.match(script,/validated=pack/);
  assert.match(script,/if \(!validated\) return/);
  assert.doesNotMatch(script,/\.innerHTML\s*=/);
  assert.doesNotMatch(script,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon)\s*\(/);
});

test('V1.1 offers local file reopen and never silently keeps stale preview or export',()=>{
  const html=source('../examples/web/lesson-designer.html');
  const script=source('../examples/web/lesson-designer.js');
  for (const id of ['import-file','import-status','import-error']) assert.ok(html.includes(`id="${id}"`));
  assert.match(script,/restoreLessonAuthoringDraft\(pack\)/);
  assert.match(script,/importOpenContentPack\(pack\);\s*const restored/);
  assert.match(script,/file\.size>1048576/);
  assert.match(script,/showUnvalidated\('Taslak değişti/);
  assert.match(script,/showUnvalidated\('Son doğrulama başarısız/);
  assert.doesNotMatch(script,/\.innerHTML\s*=/);
  assert.doesNotMatch(script,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon)\s*\(/);
});
