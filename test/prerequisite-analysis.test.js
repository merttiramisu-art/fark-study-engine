import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentHistory,recordAssessment} from '../src/assessment.js';
import {createTeachingHistory,planPersonalStudy} from '../src/learning-progress.js';
import {analyzeLearningGaps} from '../src/prerequisite-analysis.js';
const core={format:'fark-knowledge-core',version:1,
 units:[{id:'u',label:'Unit'}],
 outcomes:[{id:'base',unitId:'u',label:'Foundation'},{id:'mid',unitId:'u',label:'Intermediate',prerequisiteIds:['base']},{id:'top',unitId:'u',label:'Advanced',prerequisiteIds:['mid']}],
 resources:[{id:'r',outcomeIds:['top'],kind:'lesson',revision:'1'}],
 questions:[
  {id:'b1',outcomeIds:['base'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
  {id:'b2',outcomeIds:['base'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]},
  {id:'t1',outcomeIds:['top'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b',misconceptionId:'confusion'}]},
  {id:'t2',outcomeIds:['top'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b',misconceptionId:'confusion'}]},
  {id:'t3',outcomeIds:['top'],revision:'1',correctChoiceId:'a',choices:[{id:'a'},{id:'b'}]}
 ],mappings:[]};
const add=(history,attemptId,questionId,selectedChoiceId,at='2026-01-01T10:00:00Z')=>recordAssessment(core,history,{attemptId,questionId,selectedChoiceId,at}).history;
let history=createAssessmentHistory();
history=add(history,'a1','b1','b');history=add(history,'a2','b2','b');
history=add(history,'a3','t1','b');history=add(history,'a4','t2','b');
const at='2026-01-02T00:00:00Z';
test('V3.3.1 traverses direct and indirect prerequisite links without assuming unknown failure',()=>{
 const report=analyzeLearningGaps(core,history,{at});
 const top=report.outcomes.find(x=>x.outcomeId==='top');
 assert.deepEqual(top.prerequisites.map(x=>[x.outcomeId,x.depth]),[['mid',1],['base',2]]);
 assert.equal(top.prerequisites[0].status,'not-demonstrated');
 assert.equal(top.prerequisites[1].evidenceLevel,'repeated-observation');
});
test('V3.3.2 counts distinct questions rather than repeat attempts as stronger evidence',()=>{
 const top=analyzeLearningGaps(core,history,{at}).outcomes.find(x=>x.outcomeId==='top');
 assert.equal(top.misconceptionPatterns[0].distinctQuestions,2);
 assert.equal(top.misconceptionPatterns[0].evidenceLevel,'repeated-observation');
 const repeated=add(add(createAssessmentHistory(),'x1','t1','b'),'x2','t1','b');
 const finding=analyzeLearningGaps(core,repeated,{at}).outcomes.find(x=>x.outcomeId==='top');
 assert.equal(finding.misconceptionPatterns[0].incorrectSelections,2);
 assert.equal(finding.misconceptionPatterns[0].evidenceLevel,'single-or-repeated-item');
});
test('V3.3.3 produces transparent ranked hypotheses, never diagnoses or mastery',()=>{
 const top=analyzeLearningGaps(core,history,{at}).outcomes.find(x=>x.outcomeId==='top');
 assert.equal(top.hypotheses.length,2);
 assert.equal(top.hypotheses[0].evidenceLevel,'repeated-observation');
 assert.equal(top.mastery,null);
 assert.ok(top.hypotheses.every(x=>x.reasonCodes.length>0));
});
test('V3.3.4 enriches V3.4 without changing legacy plan output',()=>{
 const legacy=planPersonalStudy(core,history,createTeachingHistory(),{at});
 const enriched=planPersonalStudy(core,history,createTeachingHistory(),{at,includePrerequisites:true});
 const top=enriched.planned.find(x=>x.outcomeId==='top');
 assert.deepEqual(top.suggestedPrerequisites,['base']);
 assert.deepEqual(top.observedPatterns,['confusion']);
 assert.ok(top.reasonCodes.includes('observed-prerequisite-difficulty'));
 assert.ok(!('suggestedPrerequisites' in legacy.planned.find(x=>x.outcomeId==='top')));
});
test('V3.3.5 excludes future, stale and orphan attempts',()=>{
 const future=add(history,'future','t3','b','2026-02-01');
 const stale={...core,questions:core.questions.map(q=>q.id==='t1'?{...q,revision:'2'}:q)};
 const report=analyzeLearningGaps(stale,future,{at});
 assert.deepEqual(report.excluded.future,['future']);
 assert.deepEqual(report.excluded.stale,['a3']);
 assert.equal(report.outcomes.find(x=>x.outcomeId==='top').misconceptionPatterns[0].evidenceLevel,'single-or-repeated-item');
 assert.throws(()=>analyzeLearningGaps(core,history,{at,minDistinctQuestions:1}),/at least 2/);
});
test('V3.3.5 excludes changed editorial misconception tagging until revision matches',()=>{
 const altered={...core,questions:core.questions.map(q=>q.id==='t2'?{...q,choices:[{id:'a'},{id:'b',misconceptionId:'changed'}]}:q)};
 const report=analyzeLearningGaps(altered,history,{at});
 assert.deepEqual(report.excluded.stale,['a4']);
});
