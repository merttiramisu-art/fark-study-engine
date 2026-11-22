import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('V1.2 UI has accessible navigation, editor, import, preview and explicit validation controls',()=>{
 const html=read('../examples/web/course-designer.html');
 for(const id of ['entity-navigation','meta-fields','editor-fields','remove-record','import-course','validate-course','download-course','preview-content','editor-error'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(html,/lang="tr"/);assert.match(html,/aria-live="polite"/);
 assert.doesNotMatch(html,/<script[^>]*https?:\/\//);assert.doesNotMatch(html,/<link[^>]*https?:\/\//);
});
test('V1.2 UI never executes imported text, and invalidates stale preview on edit',()=>{
 const js=read('../examples/web/course-designer.js');
 assert.match(js,/importOpenContentPack\(parsed\)/);
 assert.match(js,/restoreCourseAuthoringDraft\(parsed\)/);
 assert.match(js,/importOpenContentPack\(pack\)/);
 assert.match(js,/validated=null/);
 assert.match(js,/\$\('download-course'\)\.disabled=true/);
 assert.match(js,/removeCourseEntity\(/);
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
 assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon)\s*\(/);
});
test('V1.2 UI limits file bytes and permits question answers, visuals and multiple prerequisite paths',()=>{
 const js=read('../examples/web/course-designer.js');
 assert.match(js,/file.size>COURSE_DESIGNER_LIMITS.maxBytes/);
 assert.match(js,/correctChoiceId/);
 assert.match(js,/prerequisiteIds/);
 for(const name of ['fraction-comparison','number-line','timeline'])assert.ok(js.includes(name));
});
test('V1.2 package entrypoint and TypeScript declaration are included in integration candidate',()=>{
  const patchPath=new URL('../integration-edits.patch',import.meta.url);
  const declaration=read('../types/course-authoring.d.ts');
  const routes=['/examples/web/course-designer.html','/examples/web/course-designer.js','/examples/web/course-designer.css','/src/course-authoring.js'];
  if(existsSync(patchPath)){
    const patch=read('../integration-edits.patch');
    for(const route of routes)assert.ok(patch.includes(route),'missing patch route '+route);
    assert.ok(patch.includes('"./course-authoring"'));
  }else{
    const server=read('../examples/serve-web.js');
    for(const route of routes)assert.ok(server.includes(route),'missing installed route '+route);
    const manifest=JSON.parse(read('../package.json'));
    assert.equal(manifest.exports?.['./course-authoring']?.default,'./src/course-authoring.js');
    assert.equal(manifest.exports?.['./course-authoring']?.types,'./types/course-authoring.d.ts');
  }
  for(const api of ['buildCourseAuthoringPack','restoreCourseAuthoringDraft','addCourseEntity','removeCourseEntity']){
    assert.ok(declaration.includes('function '+api));
  }
});
