/**
 * V3.3: explainable, non-diagnostic prerequisite and distractor-pattern analysis.
 * Scores are ordinal routing rules, not calibrated probabilities or student diagnoses.
 */
import { validateKnowledgeCore } from './knowledge-core.js';
import { validateAssessmentHistory } from './assessment.js';

function validDate(value) {
  const ms=Date.parse(value);
  if (!Number.isFinite(ms)) throw new RangeError('invalid analysis time');
  return ms;
}
function current(a,q) {
  return !!q && q.revision===a.questionRevision &&
    q.correctChoiceId===a.correctChoiceId &&
    JSON.stringify(q.outcomeIds)===JSON.stringify(a.outcomeIds) &&
    Array.isArray(q.choices) && q.choices.some(c=>c.id===a.selectedChoiceId) &&
    (a.correct || (q.choices.find(c=>c.id===a.selectedChoiceId)?.misconceptionId??null)===(a.misconceptionId??null));
}
function ancestry(outcomes, id) {
  const found=new Map();
  const visit=(node,depth)=>{
    for(const req of outcomes.get(node)?.prerequisiteIds??[]){
      if(req===id)continue;
      if(!found.has(req)||found.get(req)>depth+1){found.set(req,depth+1);visit(req,depth+1);}
    }
  };
  visit(id,0);
  return [...found].map(([outcomeId,depth])=>({outcomeId,depth})).sort((a,b)=>a.depth-b.depth||a.outcomeId.localeCompare(b.outcomeId));
}
/** Build observed evidence and candidate explanations without inferring causation. */
export function analyzeLearningGaps(core,history,{at,minDistinctQuestions=2}={}) {
  validateKnowledgeCore(core);validateAssessmentHistory(history);
  const now=validDate(at);
  if(!Number.isSafeInteger(minDistinctQuestions)||minDistinctQuestions<2)throw new RangeError('minDistinctQuestions must be at least 2');
  const questions=new Map(core.questions.map(q=>[q.id,q]));
  const outcomes=new Map(core.outcomes.map(o=>[o.id,o]));
  const evidence=new Map(core.outcomes.map(o=>[o.id,[]]));
  const excluded={future:[],stale:[],orphan:[]};
  for(const a of history.attempts){
    if(validDate(a.at)>now){excluded.future.push(a.id);continue;}
    const q=questions.get(a.questionId);
    if(!q||a.outcomeIds.some(id=>!outcomes.has(id))){excluded.orphan.push(a.id);continue;}
    if(!current(a,q)){excluded.stale.push(a.id);continue;}
    for(const oid of a.outcomeIds)evidence.get(oid).push(a);
  }
  const results=[];
  for(const outcome of core.outcomes){
    const events=evidence.get(outcome.id);
    const incorrect=events.filter(a=>!a.correct);
    const prerequisites=ancestry(outcomes,outcome.id).map(link=>{
      const observed=evidence.get(link.outcomeId);
      const wrong=observed.filter(a=>!a.correct);
      const distinctWrong=new Set(wrong.map(a=>a.questionId)).size;
      return {outcomeId:link.outcomeId,depth:link.depth,observedAttempts:observed.length,
        incorrect:wrong.length,distinctIncorrectQuestions:distinctWrong,
        evidenceLevel:distinctWrong>=minDistinctQuestions?'repeated-observation':wrong.length?'single-or-repeated-item':'unobserved',
        status:wrong.length?'observed-prerequisite-difficulty':'not-demonstrated'};
    });
    const tags=new Map();
    for(const a of incorrect){
      if(!a.misconceptionId)continue;
      if(!tags.has(a.misconceptionId))tags.set(a.misconceptionId,[]);
      tags.get(a.misconceptionId).push(a);
    }
    const misconceptionPatterns=[...tags].map(([misconceptionId,attempts])=>{
      const distinctQuestions=new Set(attempts.map(a=>a.questionId)).size;
      return {misconceptionId,incorrectSelections:attempts.length,distinctQuestions,
        attemptIds:attempts.map(a=>a.id),
        evidenceLevel:distinctQuestions>=minDistinctQuestions?'repeated-observation':'single-or-repeated-item',
        status:'editorial-distractor-pattern-not-diagnosis'};
    }).sort((a,b)=>b.distinctQuestions-a.distinctQuestions||b.incorrectSelections-a.incorrectSelections||a.misconceptionId.localeCompare(b.misconceptionId));
    const hypotheses=[];
    for(const p of prerequisites.filter(p=>p.incorrect)){
      hypotheses.push({type:'prerequisite',targetOutcomeId:p.outcomeId,reasonCodes:['prerequisite-link','observed-incorrect-prerequisite'],
        evidenceLevel:p.evidenceLevel,distinctQuestions:p.distinctIncorrectQuestions,observations:p.incorrect,
        depth:p.depth});
    }
    for(const p of misconceptionPatterns){
      hypotheses.push({type:'distractor-pattern',misconceptionId:p.misconceptionId,reasonCodes:['editorial-distractor-tag','observed-incorrect-selection'],
        evidenceLevel:p.evidenceLevel,distinctQuestions:p.distinctQuestions,observations:p.incorrectSelections});
    }
    // Transparent ordering: repeated observations first, then independent question count,
    // then observed count; a closer prerequisite breaks ties, then lexical ID.
    const rank=x=>x.evidenceLevel==='repeated-observation'?1:0;
    hypotheses.sort((a,b)=>rank(b)-rank(a)||b.distinctQuestions-a.distinctQuestions||
      b.observations-a.observations||(a.depth??999)-(b.depth??999)||
      (a.targetOutcomeId??a.misconceptionId).localeCompare(b.targetOutcomeId??b.misconceptionId));
    results.push({outcomeId:outcome.id,observedAttempts:events.length,incorrect:incorrect.length,
      distinctIncorrectQuestions:new Set(incorrect.map(a=>a.questionId)).size,
      prerequisites,misconceptionPatterns,hypotheses,
      status:incorrect.length?'observed-difficulty':'no-observed-difficulty',mastery:null});
  }
  return {outcomes:results,excluded,parameters:{at:new Date(now).toISOString(),minDistinctQuestions},
    disclaimer:'Evidence levels describe repeated observations on distinct question IDs, not statistical confidence, diagnosis, causal root causes, mastery or validated item independence. Unobserved prerequisites are unknown, not failed.'};
}
