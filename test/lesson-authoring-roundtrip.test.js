import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonAuthoringPack, restoreLessonAuthoringDraft } from '../src/lesson-authoring.js';
const sample = () => ({
  title:'Özgün etkinlik',creator:'Yazar',license:'MIT',unitLabel:'Sayılar',
  outcomeLabel:'Karşılaştırma',lessonTitle:'Özgün ders',lessonBody:'Basit örnek.',
  visual:{kind:'fraction-comparison',leftNumerator:'1',leftDenominator:'3',rightNumerator:'1',rightDenominator:'4'},
  questions:[{prompt:'Soru 1?',choices:['A','B','C'],correctIndex:2}]
});
const copy = value => JSON.parse(JSON.stringify(value));
test('V1.1 own packs round-trip without losing original teaching content', () => {
  const input=sample();input.questions.push({prompt:'Soru 2?',choices:['X','Y'],correctIndex:1});
  for(const visual of [
    input.visual,{kind:'none'},
    {kind:'number-line',min:'-5',max:'5',points:'-3,0,4'},
    {kind:'timeline',events:[{year:'1860',label:'Kurgu önce'},{year:'1872',label:'Kurgu sonra'}]}
  ]){
    input.visual=visual;
    const pack=buildLessonAuthoringPack(input),previous=copy(pack);
    const restored=restoreLessonAuthoringDraft(pack);
    assert.deepEqual(buildLessonAuthoringPack(restored),pack);
    assert.deepEqual(pack,previous,'restoration must not mutate input');
  }
});
test('V1.1 accepts equivalent JSON objects despite key ordering', () => {
  const pack=buildLessonAuthoringPack(sample());
  const reverse = object => Array.isArray(object) ? object.map(reverse) : object && typeof object === 'object' ?
    Object.fromEntries(Object.entries(object).reverse().map(([key,val])=>[key,reverse(val)])) : object;
  assert.deepEqual(buildLessonAuthoringPack(restoreLessonAuthoringDraft(reverse(pack))),pack);
});
test('V1.1 rejects unsupported metadata, associations and provenance loss', () => {
  const pack=buildLessonAuthoringPack(sample());
  for(const mutate of [
    p=>{p.attribution.sourceUrl='https://example.org'},
    p=>{p.units.push({id:'unit-2',label:'Other'})},
    p=>{p.units[0].prerequisiteIds=[]},
    p=>{p.outcomes[0].prerequisiteIds=[]},
    p=>{p.lessons[0].misconceptionIds=['x']},
    p=>{p.questions[0].choices[0].misconceptionId='a'},
    p=>{p.mappings.push({cardId:'x',questionId:'question-1'})},
    p=>{p.questions[0].revision='2'},
    p=>{p.questions[0].id='different'},
    p=>{p.questions[0].outcomeIds.push('other')},
    p=>{p.extra='ignored?'}
  ]){
    const damaged=copy(pack);mutate(damaged);
    assert.throws(()=>restoreLessonAuthoringDraft(damaged),undefined,JSON.stringify(damaged));
  }
});
test('V1.1 refuses data changes that the form cannot round-trip',()=>{
  const pack=buildLessonAuthoringPack(sample());
  pack.lessons[0].visual={kind:'timeline',events:[
    {id:'event-1',year:1,label:'One'},
    {id:'event-2',year:2,label:'Two'},
    {id:'event-3',year:3,label:'Three'}
  ]};
  assert.throws(()=>restoreLessonAuthoringDraft(pack),/kayıt sayısı/);
  const invalid=buildLessonAuthoringPack(sample());
  invalid.questions[0].choices[1].id='duplicate';
  assert.throws(()=>restoreLessonAuthoringDraft(invalid),/kimliği/);
});
test('V1.1 restores inert script-like lesson text, but never executes it',()=>{
  const draft=sample();draft.lessonBody='<img src=x onerror=alert(1)>';
  const restored=restoreLessonAuthoringDraft(buildLessonAuthoringPack(draft));
  assert.equal(restored.lessonBody,draft.lessonBody);
});
