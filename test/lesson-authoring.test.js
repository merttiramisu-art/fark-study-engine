import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLessonAuthoringPack} from '../src/lesson-authoring.js';

const base = () => ({
  title:'Özgün Matematik Dersleri', creator:'Örnek Eğitimci', license:'MIT',
  unitLabel:'Kesirler', outcomeLabel:'Birim kesirleri karşılaştırır',
  lessonTitle:'Eşit parçaların büyüklüğü',
  lessonBody:'Aynı bütün daha az eşit parçaya ayrıldığında her parça daha büyüktür.',
  visual:{kind:'fraction-comparison',leftNumerator:'1',leftDenominator:'3',rightNumerator:'1',rightDenominator:'4'},
  questions:[{prompt:'Hangisi daha büyük?',choices:['1/3','1/4','Eşit'],correctIndex:0}]
});

test('returns versioned Knowledge Core adapter input with one linked lesson and question',()=>{
  const input=base(), before=JSON.stringify(input);
  const pack=buildLessonAuthoringPack(input);
  assert.equal(pack.format,'fark-open-content-pack');
  assert.equal(pack.version,1);
  assert.deepEqual(pack.outcomes[0], {id:'outcome-1',unitId:'unit-1',label:input.outcomeLabel});
  assert.deepEqual(pack.lessons[0].outcomeIds,['outcome-1']);
  assert.deepEqual(pack.questions[0].outcomeIds,['outcome-1']);
  assert.equal(pack.questions[0].correctChoiceId,'a');
  assert.equal(pack.lessons[0].visual.left.denominator,3);
  assert.equal(JSON.stringify(input),before,'must not mutate draft');
});

test('supports second distinct question for later reassessment',()=>{
  const draft=base();draft.questions.push({prompt:'Hangi kesir küçük?',choices:['1/3','1/4'],correctIndex:1});
  const pack=buildLessonAuthoringPack(draft);
  assert.equal(pack.questions.length,2);
  assert.equal(pack.questions[1].id,'question-2');
  assert.equal(pack.questions[1].correctChoiceId,'b');
  assert.deepEqual(pack.mappings,[],'do not fabricate learner-card mappings');
});

test('supports number line and timeline declarative visuals',()=>{
  const draft=base();draft.visual={kind:'number-line',min:'-5',max:'5',points:'-3, 0, 4'};
  assert.deepEqual(buildLessonAuthoringPack(draft).lessons[0].visual,{kind:'number-line',min:-5,max:5,points:[-3,0,4]});
  draft.visual={kind:'timeline',events:[{year:'1860',label:'Kurgu başlangıç'},{year:'1872',label:'Kurgu devam'}]};
  assert.deepEqual(buildLessonAuthoringPack(draft).lessons[0].visual.events[1],{id:'event-2',year:1872,label:'Kurgu devam'});
});

test('does not evaluate or rewrite HTML-like text',()=>{
  const draft=base();draft.lessonBody='<img src=x onerror=alert(1)>';
  assert.equal(buildLessonAuthoringPack(draft).lessons[0].bodyText,draft.lessonBody);
});

test('fails closed on blank text, bad answer key and invalid numeric input',()=>{
  const draft=base();draft.creator='';
  assert.throws(()=>buildLessonAuthoringPack(draft),/İçerik üreticisi/);
  draft.creator='Örnek';draft.questions[0].correctIndex=4;
  assert.throws(()=>buildLessonAuthoringPack(draft),/cevap anahtarı/);
  draft.questions[0].correctIndex=0;draft.visual.leftDenominator='1/0';
  assert.throws(()=>buildLessonAuthoringPack(draft),/tam sayı/);
  draft.visual={kind:'dangerous',html:'<script>'};
  assert.throws(()=>buildLessonAuthoringPack(draft),/Desteklenmeyen/);
});

test('rejects too many questions and holes in choices',()=>{
  const draft=base();draft.questions=[];
  assert.throws(()=>buildLessonAuthoringPack(draft),/1 veya 2/);
  draft.questions=[{prompt:'Soru',choices:['Evet',''],correctIndex:0}];
  assert.throws(()=>buildLessonAuthoringPack(draft),/Seçenek/);
});
