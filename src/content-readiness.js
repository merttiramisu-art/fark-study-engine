/**
 * V4.2 editorial readiness audit for one content-driven learning loop.
 * No private curriculum, answer text, external services or student diagnosis.
 */
import {validateKnowledgeCore} from './knowledge-core.js';

const byId=(rows)=>new Map(rows.map(row=>[row.id,row]));
const unique=values=>[...new Set(values)].sort();
function hasChoiceAnswer(q){
 return typeof q.correctChoiceId==='string'&&q.correctChoiceId.trim()&&
 Array.isArray(q.choices)&&q.choices.length>=2&&
 new Set(q.choices.map(c=>c?.id)).size===q.choices.length&&
 q.choices.every(c=>typeof c?.id==='string'&&c.id.trim())&&
 q.choices.some(c=>c.id===q.correctChoiceId);
}
/**
 * Check if each outcome has enough *editorial inventory* to attempt the
 * assessment -> teaching -> distinct-question reassessment path.
 * This is not a learning effectiveness or pedagogical quality audit.
 */
export function auditLearningContent(core,{outcomeIds}={}){
 validateKnowledgeCore(core);
 const known=byId(core.outcomes);
 if(outcomeIds!==undefined&&(!Array.isArray(outcomeIds)||outcomeIds.some(id=>!known.has(id))))
  throw new RangeError('unknown or invalid outcomeIds');
 const selected=outcomeIds===undefined?core.outcomes.map(o=>o.id):unique(outcomeIds);
 const results=selected.map(id=>{
  const questions=core.questions.filter(q=>q.outcomeIds.includes(id));
  const usable=questions.filter(hasChoiceAnswer);
  const resources=core.resources.filter(r=>r.outcomeIds.includes(id));
  const problems=[];
  if(!questions.length)problems.push('no-assessment-questions');
  if(usable.length<2)problems.push('fewer-than-two-gradable-distinct-questions');
  if(!resources.length)problems.push('no-teaching-resource');
  const resourceKinds=unique(resources.map(r=>r.kind));
  const prerequisiteIds=[...(known.get(id).prerequisiteIds??[])];
  const missingPrerequisiteEvidence=prerequisiteIds.filter(pid=>!core.questions.some(q=>q.outcomeIds.includes(pid)&&hasChoiceAnswer(q)));
  if(missingPrerequisiteEvidence.length)problems.push('prerequisites-without-gradable-questions');
  return {outcomeId:id,ready:problems.length===0,questionCount:questions.length,gradableQuestionCount:usable.length,
   teachingResourceCount:resources.length,resourceKinds,prerequisiteIds,missingPrerequisiteEvidence,problems};
 });
 return {format:'fark-content-readiness',version:1,outcomes:results,
  summary:{checked:results.length,ready:results.filter(r=>r.ready).length,blocked:results.filter(r=>!r.ready).length},
  disclaimer:'Inventory readiness only. It does not verify answer correctness, explanation quality, accessibility, fairness, student learning, or secure delivery.'};
}
