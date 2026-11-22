import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNumberLineModel, buildTimelineModel, VISUAL_LEARNING_LIMITS } from '../src/visual-learning.js';

test('number line orders marked negative, zero and positive integers without mutating source', () => {
  const input = Object.freeze({min:-5,max:5,points:Object.freeze([4,-3,0])});
  const before = JSON.stringify(input);
  const model = buildNumberLineModel(input);
  assert.equal(model.kind,'number-line');
  assert.deepEqual(model.points,[-3,0,4]);
  assert.equal(model.ticks.length,11);
  assert.deepEqual(model.ticks.filter(t=>t.selected).map(t=>t.value),[-3,0,4]);
  assert.match(model.summary,/from -5 to 5/);
  assert.equal(model.mastery,null);
  assert.equal(JSON.stringify(input),before);
});

test('number line enforces finite integer bounds and strict shape', () => {
  for(const entry of [
    {min:5,max:5,points:[5]},
    {min:6,max:5,points:[5]},
    {min:-13,max:5,points:[0]},
    {min:-5,max:13,points:[0]},
    {min:-5,max:5,points:[]},
    {min:-5,max:5,points:[0,0]},
    {min:-5,max:5,points:[6]},
    {min:-5,max:5,points:[0.5]},
    {min:-5,max:5,points:[Number.NaN]},
    {min:-5,max:5,points:[0],src:'javascript:alert(1)'},
    {min:-5,max:5,points:'0'}
  ]) assert.throws(()=>buildNumberLineModel(entry));
  assert.equal(VISUAL_LEARNING_LIMITS.maxPoints,8);
});

test('fictional timeline deterministically sorts events, including equal-year IDs', () => {
  const events = [
    {id:'z',year:1920,label:'Later fictional event'},
    {id:'b',year:1880,label:'Fictional event B'},
    {id:'a',year:1880,label:'Fictional event A'}
  ];
  const before=JSON.stringify(events);
  const model=buildTimelineModel({events});
  assert.deepEqual(model.events.map(e=>e.id),['a','b','z']);
  assert.deepEqual(model.events.map(e=>e.year),[1880,1880,1920]);
  assert.equal(model.mastery,null);
  assert.match(model.summary,/Illustrative chronology/);
  assert.equal(JSON.stringify(events),before);
});

test('timeline rejects duplicate, malformed, oversized and executable metadata', () => {
  const a={id:'first',year:1900,label:'Fictional one'};
  const b={id:'second',year:1910,label:'Fictional two'};
  for(const input of [
    {events:[]},{events:[a]},{events:[a,a]},
    {events:[a,{...b,year:3001}]},
    {events:[a,{...b,year:1.5}]},
    {events:[a,{...b,id:'../bad'}]},
    {events:[a,{...b,label:''}]},
    {events:[a,{...b,label:'bad '}]},
    {events:[a,{...b,onclick:'alert(1)'}]},
    {events:[a,b],script:'evil'},
    {events:Array.from({length:9},(_,i)=>({id:'e'+i,year:1900+i,label:'Sample '+i}))}
  ]) assert.throws(()=>buildTimelineModel(input));
});

test('timeline event labels remain inert strings, not claimed verified history', () => {
  const hostile='<img src=x onerror=alert(1)>';
  const model=buildTimelineModel({events:[
    {id:'a',year:1900,label:hostile},{id:'b',year:1901,label:'Invented second'}]});
  assert.equal(model.events[0].label,hostile);
  assert.equal(typeof model.events[0].label,'string');
});
