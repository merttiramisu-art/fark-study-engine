import test from 'node:test';
import assert from 'node:assert/strict';
import {createCard,reviewCard,selectReviewQueue,getStudySummary,getTopicSummaries,getMistakeBreakdown,MISTAKE_REASONS} from '../src/index.js';

const T='2026-11-13T12:00:00.000Z';
const c=(id,topic='Math')=>createCard({id,topic,question:'2+3?',answer:'5'});

test('legacy v0.1 card remains readable without reasonCounts',()=>{
 const old=reviewCard(c('x'),'again',T);delete old.reasonCounts;
 assert.equal(getMistakeBreakdown([old]).unspecified,1);
 const next=reviewCard(old,'again','2026-11-13T12:11:00Z',{reason:'knowledge-gap'});
 assert.equal(next.reasonCounts['knowledge-gap'],1);
 assert.equal(next.reviews,2);
});
test('self-reported mistake reasons are not invented',()=>{
 let a=reviewCard(c('a'),'again',T,{reason:'misconception'});
 a=reviewCard(a,'again','2026-11-13T12:11:00Z');
 const b=reviewCard(c('b'),'again',T,{reason:'attention'});
 assert.deepEqual(getMistakeBreakdown([a,b]),{
  totalLapses:3,classified:2,unspecified:1,
  byReason:{'knowledge-gap':0,misconception:1,attention:1,other:0}
 });
});
test('recording a new review never mutates older review snapshots',()=>{
 const first=reviewCard(c('x'),'again',T,{reason:'other'});
 const snapshot=structuredClone(first);
 const next=reviewCard(first,'again','2026-11-13T12:11:00Z',{reason:'other'});
 assert.deepEqual(first,snapshot);
 assert.equal(next.reasonCounts.other,2);
});
test('only a self-reported again review accepts classified reason',()=>{
 assert.throws(()=>reviewCard(c('x'),'good',T,{reason:'attention'}),/reason/);
 assert.throws(()=>reviewCard(c('x'),'again',T,{reason:'unknown'}),/reason/);
 assert.throws(()=>reviewCard(c('x'),'again',T,[]),/options/);
 assert.throws(()=>reviewCard(c('x'),'again',T,{extra:true}),/unknown review option/);
 assert.deepEqual(MISTAKE_REASONS,['knowledge-gap','misconception','attention','other']);
});
test('topic insights measure real review counts, with unknown accuracy null',()=>{
 const a=reviewCard(c('a','Zoology'),'good',T);
 const b=reviewCard(c('b','Math'),'again',T);
 const groups=getTopicSummaries([a,b,c('c')],'2026-11-13T12:11:00Z');
 assert.deepEqual(groups.map(x=>x.topic),['Math','Zoology']);
 assert.deepEqual(groups[0],{topic:'Math',total:2,new:1,due:2,studied:1,mature:0,totalReviews:1,correctReviews:0,accuracy:0});
 assert.equal(groups[1].due,0);
 assert.equal(getTopicSummaries([c('n')],T)[0].accuracy,null);
});
test('duplicate card ids cannot inflate summary, insight, or review queue',()=>{
 const list=[c('same'),c('same','Other')];
 for(const fn of [x=>getStudySummary(x,T),x=>getTopicSummaries(x,T),getMistakeBreakdown,x=>selectReviewQueue(x,T)]){
  assert.throws(()=>fn(list),/duplicate card id/);
 }
});
test('impossible counter and reason state is rejected',()=>{
 const a=c('x');
 assert.throws(()=>getStudySummary([{...a,correct:1,reviews:2}],T),/inconsistent/);
 assert.throws(()=>getMistakeBreakdown([{...a,reasonCounts:{attention:1}}]),/exceed recorded lapses/);
 assert.throws(()=>getMistakeBreakdown([{...a,reasonCounts:{garbage:1}}]),/unknown mistake reason/);
 assert.throws(()=>getMistakeBreakdown([{...a,reasonCounts:{attention:-1}}]),/non-negative/);
});
test('incomplete or corrupted content cannot count toward learning analytics',()=>{
 const a=c('x');
 for(const key of ['topic','question','answer']) assert.throws(()=>getTopicSummaries([{...a,[key]:''}],T),new RegExp(key));
 assert.throws(()=>getStudySummary([{...a,reviews:0,dueAt:T}],T),/unreviewed/);
 assert.throws(()=>getStudySummary([{...a,reviews:1,correct:1}],T),/reviewed card needs/);
});
test('bad dates and retroactive reviews are rejected',()=>{
 const first=reviewCard(c('x'),'hard',T);
 assert.throws(()=>reviewCard(first,'good','2026-11-12T12:00:00Z'),/before/);
 assert.throws(()=>getTopicSummaries([first],'bad-time'),/valid date/);
 assert.throws(()=>getStudySummary([{...first,lastReviewedAt:'bad-time'}],T),/valid date/);
});
test('empty decks do not fabricate success',()=>{
 assert.deepEqual(getTopicSummaries([],T),[]);
 assert.deepEqual(getMistakeBreakdown([]),{totalLapses:0,classified:0,unspecified:0,
  byReason:{'knowledge-gap':0,misconception:0,attention:0,other:0}});
 assert.equal(getStudySummary([],T).accuracy,null);
});
test('existing queue order and accuracy remain unchanged',()=>{
 const a=reviewCard(c('a'),'good',T);
 const b=reviewCard(c('b'),'again',T,{reason:'knowledge-gap'});
 assert.deepEqual(selectReviewQueue([a,b],'2026-11-13T12:11:00Z').map(x=>x.id),['b']);
 assert.equal(getStudySummary([a,b],T).accuracy,0.5);
});
test('JSON round-trip and historical card restoration',()=>{
 const serialized=JSON.stringify(reviewCard(c('x'),'again',T,{reason:'knowledge-gap'}));
 const restored=JSON.parse(serialized);
 assert.equal(getMistakeBreakdown([restored]).classified,1);
 assert.equal(reviewCard(restored,'good','2026-11-13T12:11:00Z').reviews,2);
});
test('1000 seeded review sequences preserve all accounting invariants',()=>{
 let seed=43871;
 const roll=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n};
 const ratings=['again','hard','good','easy'];
 for(let i=0;i<1000;i++){
  let item=c('item-'+i);
  for(let j=0;j<8;j++){
   const rating=ratings[roll(4)];
   const time=new Date(Date.parse(T)+j*86400000).toISOString();
   item=reviewCard(item,rating,time,rating==='again'&&roll(2)===0?{reason:'attention'}:{});
  }
  assert.equal(item.reviews,8);
  assert.equal(item.correct+item.lapses,8);
  assert.equal(getMistakeBreakdown([item]).totalLapses,item.lapses);
  assert.ok(item.box>=0&&item.box<=6);
 }
});
