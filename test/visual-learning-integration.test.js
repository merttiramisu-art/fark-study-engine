import test from 'node:test';
import assert from 'node:assert/strict';
import { importMarkdownContentPack } from '../src/markdown-content.js';
import { importOpenContentPack } from '../src/content-adapter.js';
import { buildNumberLineModel, buildTimelineModel } from '../src/visual-learning.js';
import { NUMBER_LINE_SAMPLE, TIMELINE_SAMPLE } from '../examples/web/visual-learning-samples.js';

test('original number-line authoring flows from Markdown into the validated visual model', () => {
  const result=importMarkdownContentPack(NUMBER_LINE_SAMPLE);
  assert.equal(result.core.resources.length,1);
  assert.equal(result.core.questions.length,1);
  const lesson=result.materials.lessons[0];
  assert.equal(lesson.visual.kind,'number-line');
  assert.deepEqual(lesson.visual,{kind:'number-line',min:-5,max:5,points:[-3,0,4]});
  const model=buildNumberLineModel({min:lesson.visual.min,max:lesson.visual.max,points:lesson.visual.points});
  assert.deepEqual(model.ticks.filter(t=>t.selected).map(t=>t.value),[-3,0,4]);
  assert.equal(model.mastery,null);
});

test('number-line JSON pack yields exactly the same visual and material fields', () => {
  const md=importMarkdownContentPack(NUMBER_LINE_SAMPLE);
  const json=importOpenContentPack({
    format:'fark-open-content-pack',version:1,
    attribution:{title:'Signed numbers visual lab',creator:'FARK Study Engine contributors',license:'MIT'},
    units:[{id:'integers',label:'Signed numbers'}],
    outcomes:[{id:'locate-integers',unitId:'integers',label:'Locate integers on a number line'}],
    lessons:[{id:'signed-positions',revision:'1',title:'Left of zero, right of zero',
      outcomeIds:['locate-integers'],
      bodyText:'Negative numbers are left of zero; positive numbers are right of zero. The marked positions are -3, 0 and 4. This is an original example, not a learning assessment.',
      visual:{kind:'number-line',min:-5,max:5,points:[4,-3,0]}}],
    questions:[{id:'signed-practice',revision:'1',outcomeIds:['locate-integers'],
      prompt:'Which number is located to the left of zero?',correctChoiceId:'a',
      choices:[{id:'a',text:'-3'},{id:'b',text:'4'}]}]
  });
  assert.deepEqual(json,md);
});

test('original fictional timeline is validated and sorted without historical claims', () => {
  const imported=importMarkdownContentPack(TIMELINE_SAMPLE);
  const visual=imported.materials.lessons[0].visual;
  assert.equal(visual.kind,'timeline');
  assert.deepEqual(visual.events.map(e=>e.year),[1860,1872,1895]);
  assert.deepEqual(visual.events.map(e=>e.id),['event-1','event-2','event-3']);
  assert.ok(visual.events.every(e=>e.label.includes('Fictional')));
  assert.equal(buildTimelineModel({events:visual.events}).mastery,null);
  const json=importOpenContentPack({
    format:'fark-open-content-pack',version:1,
    attribution:{title:'Fictional town chronology',creator:'FARK Study Engine contributors',license:'MIT'},
    units:[{id:'local-stories',label:'Fictional community stories'}],
    outcomes:[{id:'sort-events',unitId:'local-stories',label:'Place fictional events in chronological order'}],
    lessons:[{id:'town-events',revision:'1',outcomeIds:['sort-events'],title:'A fictional reading town',
      bodyText:'These invented events show how a timeline orders moments. They are not claims about an actual town, historical institution or educational result.',
      visual:{kind:'timeline',events:[
        {id:'event-1',year:1860,label:'Fictional archive founded'},
        {id:'event-2',year:1872,label:'Fictional reading room opens'},
        {id:'event-3',year:1895,label:'Fictional library expands'}
      ]}}],
    questions:[{id:'earliest-event',revision:'1',outcomeIds:['sort-events'],
      prompt:'Which invented event happened first?',correctChoiceId:'a',
      choices:[{id:'a',text:'Fictional archive founded'},{id:'b',text:'Fictional library expands'}]}]
  });
  assert.deepEqual(imported,json);
});

test('mixed or missing Markdown visual declarations are rejected, not silently ignored', () => {
  const bad=[
    NUMBER_LINE_SAMPLE.replace('visualKind: number-line','visualKind: map'),
    NUMBER_LINE_SAMPLE.replace('visualRange: -5..5','visualRange: 5..-5'),
    NUMBER_LINE_SAMPLE.replace('visualPoints: -3,0,4','visualPoints: -3,-3,4'),
    NUMBER_LINE_SAMPLE.replace('visualPoints: -3,0,4','visualPoints: -3,0,14'),
    NUMBER_LINE_SAMPLE.replace('visualPoints: -3,0,4','visualLeft: 1/3\nvisualPoints: -3,0,4'),
    NUMBER_LINE_SAMPLE.replace('visualRange: -5..5\n',''),
    TIMELINE_SAMPLE.replace('visualEvents: ','visualEvents: 1900|Extra,'),
    TIMELINE_SAMPLE.replace('visualEvents: 1860|Fictional archive founded,1872|Fictional reading room opens,1895|Fictional library expands','visualEvents: 1900|Only one')
  ];
  // The extra fourth event remains valid; all other mutations must fail.
  const [kind,order,duplicate,outOfBounds,mixed,missing,,oneEvent]=bad;
  for(const source of [kind,order,duplicate,outOfBounds,mixed,missing,oneEvent]) {
    assert.throws(()=>importMarkdownContentPack(source));
  }
});

test('legacy original fraction visual remains supported without visualKind', async () => {
  const {readFileSync}=await import('node:fs');
  const {fileURLToPath}=await import('node:url');
  const legacy=readFileSync(fileURLToPath(new URL('../examples/content-packs/original-fractions.md',import.meta.url)),'utf8');
  const imported=importMarkdownContentPack(legacy);
  assert.equal(imported.materials.lessons[0].visual.kind,'fraction-comparison');
});
