/**
 * FARK Study Desk V1: a read-only presentation model combining the existing
 * Content Bridge, Concept Map, Learning Path and visual learning engines.
 * No student records, achievements, diagnoses or teaching are synthesized.
 */
import { buildConceptMap } from './concept-map.js';
import { getConceptStudyPath } from './concept-study-path.js';
import { compareFractionModels } from './visual-math.js';
import { buildNumberLineModel, buildTimelineModel } from './visual-learning.js';

function lessonView(lesson) {
  if (!lesson) return null;
  let visual = null;
  if (lesson.visual) {
    const item = lesson.visual;
    if (item.kind === 'fraction-comparison') {
      visual = {kind: item.kind, model: compareFractionModels(item.left, item.right)};
    } else if (item.kind === 'number-line') {
      visual = {kind: item.kind, model: buildNumberLineModel({
        min:item.min, max:item.max, points:item.points
      })};
    } else if (item.kind === 'timeline') {
      visual = {kind: item.kind, model: buildTimelineModel({events:item.events})};
    } else {
      throw new RangeError('unsupported lesson visual type');
    }
  }
  return {id:lesson.id,title:lesson.title,bodyText:lesson.bodyText,visual};
}

/**
 * Returns an inert, content-based teaching view. The only optional question
 * override is used by a caller that already issued a different question via
 * the reassessment ledger; its ID must still be linked to this outcome.
 * NEVER returns the answer key to the view.
 */
export function buildStudyDeskView(imported, assessments, teaching,
  {outcomeId,at,issuedQuestionId=null}) {
  if (!imported || typeof imported !== 'object' ||
      !imported.core || !imported.materials ||
      !Array.isArray(imported.materials.lessons) ||
      !Array.isArray(imported.materials.questions)) {
    throw new TypeError('validated imported content pack required');
  }
  const core=imported.core;
  const map=buildConceptMap(core,assessments);
  const node=map.nodes.find(x=>x.id===outcomeId);
  if (!node) throw new RangeError('unknown study desk outcome');
  const path=getConceptStudyPath(core,assessments,teaching,{outcomeId,at});
  const linkedResources=core.resources.filter(r=>
    r.outcomeIds.includes(outcomeId) &&
    r.kind==='lesson' && !r.misconceptionIds
  ).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  // Before an error, show a generic editorial lesson if provided. After an
  // error, a specifically recommended resource always takes precedence.
  const selectedResourceId=path.resourceId??linkedResources[0]?.id??null;
  const lesson=lessonView(imported.materials.lessons.find(x=>x.id===selectedResourceId));
  if (issuedQuestionId!==null &&
      (typeof issuedQuestionId!=='string' ||
       !core.questions.some(q=>q.id===issuedQuestionId&&q.outcomeIds.includes(outcomeId)))) {
    throw new RangeError('issued question is not linked to selected outcome');
  }
  const questionId=issuedQuestionId??(path.status==='first-question'?path.questionId:null);
  const material=imported.materials.questions.find(q=>q.id===questionId);
  const question=material?{
    id:material.id,prompt:material.prompt,
    choices:material.choices.map(c=>({id:c.id,text:c.text}))
  }:null;
  if (questionId&&!question) throw new RangeError('missing presentation data for question');
  return {
    format:'fark-study-desk-view',version:1,
    outcome:{id:node.id,label:node.label,unitLabel:node.unitLabel,
      attempts:node.attempts,correct:node.correct,incorrect:node.incorrect,status:node.status,
      prerequisites: path.prerequisites},
    lesson,question,
    path:{
      status:path.status,nextAction:path.nextAction,reason:path.reason,
      baselineAttemptId:path.baselineAttemptId??null,
      resourceId:path.resourceId,questionId:path.questionId,
      mastery:null
    },
    attribution:{
      title:imported.attribution?.title??'Untitled author-declared content',
      creator:imported.attribution?.creator??'Unknown author',
      license:imported.attribution?.license??'Not declared'
    },
    disclaimer:'Content authors declare their own license and prerequisites. Correct answers are observations, lesson review is self-reported and mastery/learning effectiveness is not established.',
    mastery:null
  };
}
