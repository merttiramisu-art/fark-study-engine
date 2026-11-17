import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../src/index.js';
import { createLedger, recordLedgerReview } from '../src/ledger.js';
import { validateKnowledgeCore, connectKnowledgeCore, suggestRemediation } from '../src/knowledge-core.js';

const core = {
  format:'fark-knowledge-core',version:1,
  units:[{id:'u1',label:'General topic'}],
  outcomes:[{id:'o1',unitId:'u1',label:'Understand a concept'}],
  resources:[{id:'r1',outcomeIds:['o1'],kind:'lesson',revision:'1'}],
  questions:[{id:'q1',outcomeIds:['o1'],resourceId:'r1',revision:'1'}],
  mappings:[{cardId:'c1',questionId:'q1'}]
};
const at='2026-01-01T00:00:00.000Z';
test('knowledge core validates and never mutates source', () => {
  const before=JSON.stringify(core);
  assert.equal(validateKnowledgeCore(core),core);
  assert.equal(JSON.stringify(core),before);
});
test('joins review evidence to outcomes without claiming mastery', () => {
  const card=createCard({id:'c1',topic:'General topic',question:'Example?',answer:'Example.'});
  const initial=createLedger({createdAt:at,cards:[card]});
  const {ledger}=recordLedgerReview(initial,'c1','again',at,{reason:'knowledge-gap'});
  const report=connectKnowledgeCore(core,ledger);
  assert.deepEqual(report.mappingCoverage,{mapped:1,total:1});
  assert.equal(report.outcomes[0].again,1);
  assert.equal(report.outcomes[0].reasonCounts['knowledge-gap'],1);
  assert.equal(report.outcomes[0].mastery,null);
  assert.deepEqual(suggestRemediation(core,report)[0].resourceIds,['r1']);
  assert.equal(initial.events.length,0);
});
test('rejects broken references, duplicates and prerequisite cycles', () => {
  assert.throws(()=>validateKnowledgeCore({...core,questions:[{id:'q1',outcomeIds:['missing'],revision:'1'}]}),/unknown question outcome/);
  assert.throws(()=>validateKnowledgeCore({...core,mappings:[...core.mappings,...core.mappings]}),/duplicate mapped card/);
  const cyclic={...core,outcomes:[{id:'o1',unitId:'u1',label:'Concept',prerequisiteIds:['o1']}]};
  assert.throws(()=>validateKnowledgeCore(cyclic),/cyclic/);
  assert.throws(()=>validateKnowledgeCore({...core,units:[{id:'u1',label:'Unit',prerequisiteIds:['u1']}]}),/cyclic unit/);
});
test('unmapped cards are reported instead of silently attributed',()=>{
  const card=createCard({id:'other',topic:'General topic',question:'Another?',answer:'Answer'});
  const ledger=createLedger({createdAt:at,cards:[card]});
  const report=connectKnowledgeCore(core,ledger);
  assert.deepEqual(report.unmappedCards,['other']);
  assert.equal(report.outcomes[0].reviews,0);
});
