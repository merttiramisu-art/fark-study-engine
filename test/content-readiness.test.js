import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLearningContent} from '../src/content-readiness.js';
const core={format:'fark-knowledge-core',version:1,
 units:[{id:'u',label:'Unit'}],
 outcomes:[{id:'base',unitId:'u',label:'Foundation'},{id:'target',unitId:'u',label:'Target',prerequisiteIds:['base']}],
 resources:[{id:'lesson',outcomeIds:['target'],kind:'lesson',revision:'1'}],
 questions:[
 {id:'b',outcomeIds:['base'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
 {id:'q1',outcomeIds:['target'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
 {id:'q2',outcomeIds:['target'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]}
 ],mappings:[]};
test('V4.2 reports a complete synthetic target learning loop',()=>{
 const result=auditLearningContent(core,{outcomeIds:['target']});
 assert.equal(result.summary.ready,1);
 assert.equal(result.outcomes[0].gradableQuestionCount,2);
 assert.deepEqual(result.outcomes[0].prerequisiteIds,['base']);
});
test('V4.2 exposes editorial gaps without inventing content or mastery',()=>{
 const result=auditLearningContent(core);
 assert.equal(result.summary.blocked,1);
 assert.deepEqual(result.outcomes[0].problems,['fewer-than-two-gradable-distinct-questions','no-teaching-resource']);
 assert.equal(result.outcomes[1].ready,true);
});
test('V4.2 catches missing correct answer, duplicate choices and untested prerequisite',()=>{
 const broken={...core,questions:core.questions.filter(q=>q.id!=='b').map(q=>q.id==='q2'?{...q,choices:[{id:'a'},{id:'a'}]}:q)};
 const row=auditLearningContent(broken,{outcomeIds:['target']}).outcomes[0];
 assert.deepEqual(row.problems,['fewer-than-two-gradable-distinct-questions','prerequisites-without-gradable-questions']);
 assert.deepEqual(row.missingPrerequisiteEvidence,['base']);
});
test('V4.2 rejects invalid outcome IDs and preserves input',()=>{
 const original=JSON.stringify(core);
 assert.throws(()=>auditLearningContent(core,{outcomeIds:['missing']}),/unknown/);
 assert.deepEqual(auditLearningContent(core,{outcomeIds:['target','target']}).summary,{checked:1,ready:1,blocked:0});
 assert.equal(JSON.stringify(core),original);
});
