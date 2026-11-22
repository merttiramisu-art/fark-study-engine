import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCourseAuthoringPack,restoreCourseAuthoringDraft,addCourseEntity,removeCourseEntity,COURSE_DESIGNER_LIMITS,relationshipSummary} from '../src/course-authoring.js';
const fixture=()=>({
  format:'fark-open-content-pack',version:1,
  attribution:{title:'Original math',creator:'Teacher',license:'MIT',sourceUrl:'https://example.org/original'},
  units:[{id:'basics',label:'Basics'},{id:'advanced',label:'Advanced',prerequisiteIds:['basics']}],
  outcomes:[{id:'a',unitId:'basics',label:'Recognize'},{id:'b',unitId:'advanced',label:'Compare',prerequisiteIds:['a']}],
  lessons:[{id:'l1',revision:'12',title:'Numbers',outcomeIds:['a','b'],bodyText:'Original text',misconceptionIds:['common-gap'],visual:{kind:'timeline',events:[{id:'start',year:1900,label:'Fictional start'},{id:'end',year:1910,label:'Fictional end'}]}}],
  questions:[{id:'q1',revision:'4',outcomeIds:['b'],prompt:'Which original answer?',correctChoiceId:'z',choices:[{id:'x',text:'Wrong',misconceptionId:'common-gap'},{id:'z',text:'Correct'}]}],
  mappings:[]
});
const copy=x=>JSON.parse(JSON.stringify(x));
test('V1.2 retains two units, two outcomes, multi-outcome lesson and a question with stable IDs',()=>{
 const original=fixture(), before=copy(original);
 const packed=buildCourseAuthoringPack(original);
 assert.deepEqual(packed,original);
 assert.deepEqual(original,before,'cannot mutate authored input');
 assert.deepEqual(restoreCourseAuthoringDraft(packed),original);
 assert.equal(relationshipSummary(original).outcomes,2);
});
test('V1.2 round-trip keeps optional source URL, explicit empty prerequisites and no visual',()=>{
 const original=fixture();original.units[0].prerequisiteIds=[];original.lessons[0].visual=undefined;
 delete original.lessons[0].visual;
 original.lessons[0].misconceptionIds=[];
 assert.deepEqual(buildCourseAuthoringPack(restoreCourseAuthoringDraft(original)),original);
});
test('V1.2 supports all three bounded visual kinds and retains timeline event IDs',()=>{
 const original=fixture();
 for(const visual of [
  {kind:'fraction-comparison',left:{numerator:1,denominator:3},right:{numerator:1,denominator:4}},
  {kind:'number-line',min:-5,max:5,points:[-3,0,4]},
  {kind:'timeline',events:[{id:'foo',year:1,label:'A'},{id:'bar',year:2,label:'B'},{id:'end',year:3,label:'C'}]}
 ]){original.lessons[0].visual=visual;assert.deepEqual(buildCourseAuthoringPack(original).lessons[0].visual,visual);}
});
test('V1.2 refuses every unsupported field instead of dropping content',()=>{
 for(const alter of [
  p=>{p.extra='hidden'},p=>{p.attribution.authorNotes='secret'},p=>{p.units[0].image='abc'},
  p=>{p.outcomes[0].extraField=true},p=>{p.lessons[0].visual.events[0].html='unsafe'},
  p=>{p.questions[0].choices[0].explanation='unsupported'},p=>{p.mappings.push({cardId:'review-1',questionId:'q1'})}
 ]){const p=fixture();alter(p);assert.throws(()=>restoreCourseAuthoringDraft(p));}
});
test('V1.2 rejects whitespace-normalized IDs and text, repeated IDs and malformed keys',()=>{
 const checks=[p=>{p.units[0].id=' a'},p=>{p.units[0].label=' hello '},p=>{p.outcomes[1].id='a'},
  p=>{p.questions[0].choices[1].id='x'},p=>{p.questions[0].correctChoiceId='missing'},
  p=>{p.lessons[0].bodyText=' '},p=>{p.outcomes[0].unitId='!'}];
 for(const alter of checks){const p=fixture();alter(p);assert.throws(()=>buildCourseAuthoringPack(p));}
});
test('V1.2 refuses unsafe provenance and oversized inputs',()=>{
 for(const sourceUrl of ['file:///tmp/secret','javascript:alert(1)','http://example.com']){
  const p=fixture();p.attribution.sourceUrl=sourceUrl;assert.throws(()=>buildCourseAuthoringPack(p),/HTTPS/);
 }
 const p=fixture();p.lessons=[];
 p.questions=Array.from({length:COURSE_DESIGNER_LIMITS.questions},(_,i)=>({...fixture().questions[0],id:'q'+i,prompt:'A'.repeat(2000)}));
 assert.ok(buildCourseAuthoringPack(p).questions.length>100);
 p.questions.push({...p.questions[0],id:'overflow'});
 assert.throws(()=>buildCourseAuthoringPack(p),/120/);
});
test('V1.2 adds unique stable IDs without changing existing references',()=>{
 let p=fixture();let out=addCourseEntity(p,'unit');
 assert.equal(out.selectedId,'unit-1');p=out.draft;
 out=addCourseEntity(p,'outcome');p=out.draft;
 assert.equal(p.outcomes.at(-1).unitId,'basics');
 out=addCourseEntity(p,'lesson');p=out.draft;
 assert.deepEqual(p.lessons.at(-1).outcomeIds,['a']);
 out=addCourseEntity(p,'question');p=out.draft;
 assert.equal(p.questions.at(-1).correctChoiceId,'a');
 assert.equal(p.lessons[0].outcomeIds[1],'b');
});
test('V1.2 refuses deletion when unit/outcome is still referenced',()=>{
 const p=fixture();
 assert.throws(()=>removeCourseEntity(p,'unit','basics'),/bağlantıda/);
 assert.throws(()=>removeCourseEntity(p,'outcome','a'),/bağlantıda/);
 assert.deepEqual(p,fixture(),'failed delete cannot mutate input');
});
test('V1.2 removes detached records without cascades',()=>{
 const p=fixture();p.lessons.push({id:'l2',revision:'1',title:'Temporary',bodyText:'Example',outcomeIds:['a']});
 const out=removeCourseEntity(p,'lesson','l2');
 assert.deepEqual(out.lessons.map(v=>v.id),['l1']);
 assert.equal(p.lessons.length,2);
});
test('V1.2 never deletes the last required unit, outcome or question',()=>{
 const p=fixture();p.units=[{id:'one',label:'One'}];p.outcomes=[{id:'only',unitId:'one',label:'Only'}];p.lessons=[];
 p.questions[0].outcomeIds=['only'];
 assert.throws(()=>removeCourseEntity(p,'unit','one'),/Son zorunlu/);
 assert.throws(()=>removeCourseEntity(p,'outcome','only'),/Son zorunlu/);
 assert.throws(()=>removeCourseEntity(p,'question','q1'),/Son zorunlu/);
});
test('V1.2 preserves inert user-authored HTML-like text, without evaluating it',()=>{
 const p=fixture();p.lessons[0].bodyText='<img src=x onerror=alert(1)>';
 assert.equal(buildCourseAuthoringPack(p).lessons[0].bodyText,p.lessons[0].bodyText);
});
test('V1.2 cannot accept unsupported package version or nested object shapes',()=>{
 const p=fixture();p.version=2;assert.throws(()=>buildCourseAuthoringPack(p),/sürümü/);
 p.version=1;p.questions[0].choices=[{id:'a',text:'one'}];assert.throws(()=>buildCourseAuthoringPack(p),/2–8/);
});
