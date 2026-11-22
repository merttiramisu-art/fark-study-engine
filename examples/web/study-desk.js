/**
 * FARK Study Desk: a single, local-only experience composed from public
 * assessment, content, visual and learning-orchestration APIs.
 * The sample is not a learner account, diagnosis or mastery engine.
 */
import { importOpenContentPack } from '../../src/content-adapter.js';
import { importMarkdownContentPack } from '../../src/markdown-content.js';
import { createAssessmentHistory, recordAssessment } from '../../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../../src/learning-progress.js';
import { createReassessmentLedger, issueReassessment, verifyIssuedReassessment } from '../../src/reassessment-ledger.js';
import { buildConceptMap } from '../../src/concept-map.js';
import { buildStudyDeskView } from '../../src/study-desk.js';
import { STUDY_DESK_SAMPLE } from './study-desk-sample.js';
import { NUMBER_LINE_SAMPLE } from './visual-learning-samples.js';

const $=id=>document.getElementById(id);
let imported = importOpenContentPack(STUDY_DESK_SAMPLE);
let history = createAssessmentHistory();
let teaching = createTeachingHistory();
let issued = createReassessmentLedger();
let activeIssue = null;
let lastVerification = null;
let selectedId = 'compare-fractions';
let attemptSequence = 0;
let completionSequence = 0;
let issueSequence = 0;
let lastMs = 0;
let feedback = 'Answers are recorded only when you choose an option.';

function nextTime() {
  lastMs = Math.max(Date.now(),lastMs+1);
  return new Date(lastMs).toISOString();
}
function clock() { return new Date(Math.max(Date.now(),lastMs)).toISOString(); }
function el(tag,cls,text) {
  const element=document.createElement(tag);
  if(cls) element.className=cls;
  if(text!==undefined) element.textContent=text;
  return element;
}
function addText(parent,tag,cls,value) {
  const child=el(tag,cls,value);
  parent.append(child);
  return child;
}
function renderFraction(model) {
  const wrap=el('div','fraction-visual');
  for(const [index,side] of [model.left,model.right].entries()) {
    const row=el('div','fraction-row'+(index?' secondary':''));
    addText(row,'span','fraction-label',side.label);
    const bar=el('div','fraction-bar');
    bar.style.gridTemplateColumns='repeat('+side.denominator+',minmax(0,1fr))';
    bar.setAttribute('role','img');
    bar.setAttribute('aria-label',side.numerator+' of '+side.denominator+' equal parts shaded');
    side.filled.forEach(isFilled=>{
      const cell=el('span',isFilled?'filled':'');
      cell.setAttribute('aria-hidden','true');
      bar.append(cell);
    });
    row.append(bar);
    wrap.append(row);
  }
  addText(wrap,'p','fraction-result',model.label);
  return wrap;
}
function renderNumberLine(model) {
  const wrap=el('div','number-visual');
  const list=el('ol','tick-list');
  list.setAttribute('aria-label',model.summary);
  for (const tick of model.ticks) {
    list.append(el('li',tick.selected?'marked':'',String(tick.value)));
  }
  wrap.append(list);
  addText(wrap,'p','number-caption','Marked points: '+model.points.join(', '));
  return wrap;
}
function renderTimeline(model) {
  const list=el('ol','timeline-list');
  list.setAttribute('aria-label',model.summary);
  for (const event of model.events) {
    const li=el('li','');
    addText(li,'div','event-year',String(event.year));
    addText(li,'div','event-label',event.label);
    list.append(li);
  }
  return list;
}
function renderVisual(lesson) {
  const stage=$('lesson-visual');
  stage.replaceChildren();
  if(!lesson?.visual) {
    stage.append(el('p','empty-visual',
      lesson?'This original lesson has no declared diagram. The lesson text remains available.':
        'No editorial lesson is linked to this concept.'));
    $('visual-note').textContent='No visual was invented; the author controls lesson diagrams.';
    return;
  }
  const {kind,model}=lesson.visual;
  if(kind==='fraction-comparison') stage.append(renderFraction(model));
  else if(kind==='number-line') stage.append(renderNumberLine(model));
  else if(kind==='timeline') stage.append(renderTimeline(model));
  else throw new RangeError('unsupported visual');
  $('visual-note').textContent=kind==='timeline'
    ? 'Fictional events for ordering practice; not verified historical facts.'
    : 'A bounded, deterministic visual from this same content pack.';
}
function renderTopics() {
  const wrap=$('topic-list');
  wrap.replaceChildren();
  const report=buildConceptMap(imported.core,history);
  for(const outcome of imported.core.outcomes) {
    const node=report.nodes.find(n=>n.id===outcome.id);
    const button=el('button','topic-btn'+(selectedId===node.id?' active':''));
    button.type='button';
    button.dataset.outcome=node.id;
    button.setAttribute('aria-pressed',String(selectedId===node.id));
    button.append(el('strong','',node.label),
      el('small','',node.unitLabel),
      el('span','observation',node.attempts
        ? node.correct+' correct / '+node.incorrect+' incorrect observed'
        : 'No answer yet'));
    button.addEventListener('click',()=>{
      selectedId=node.id;
      $('desk-error').hidden=true;
      render();
    });
    wrap.append(button);
  }
}
function view() {
  return buildStudyDeskView(imported,history,teaching,{
    outcomeId:selectedId,at:clock(),
    issuedQuestionId:activeIssue?.outcomeId===selectedId
      ? activeIssue.questionId : null
  });
}
function renderQuestion(question) {
  const options=$('practice-options');
  options.replaceChildren();
  if(!question) {
    $('practice-question').textContent='No new question to answer at this stage.';
    addText(options,'p','empty-visual','Select an unanswered concept, or review the linked lesson to unlock an explicitly issued different question.');
    return;
  }
  $('practice-question').textContent=question.prompt;
  for (const choice of question.choices) {
    const button=el('button','',choice.text);
    button.type='button';
    button.dataset.choice=choice.id;
    button.addEventListener('click',()=>guarded(()=>submitAnswer(question.id,choice.id)));
    options.append(button);
  }
}
function renderPath(report) {
  const path=report.path;
  $('path-outcome').textContent=report.outcome.label;
  $('path-status').textContent=path.status;
  $('path-reason').textContent=path.reason;
  const list=$('path-prereqs');
  list.replaceChildren();
  if(!report.outcome.prerequisites.length) {
    addText(list,'li','','No prerequisite declared. This does not indicate mastery.');
  } else for(const item of report.outcome.prerequisites) {
    const summary=item.status==='not-observed'?'no answer yet':
      item.status==='mixed-observations'?'mixed observations':
      item.status==='correct-observed'?'correct observed':'incorrect observed';
    addText(list,'li','',item.label+': '+summary+
      ' ('+item.observedAttempts+' answer(s); mastery unknown)');
  }
  const canReview=path.status==='teaching-needed' &&
    !!report.lesson && report.lesson.id===path.resourceId;
  $('lesson-review-area').hidden=!canReview;
  $('issue-different').hidden=path.status!=='ready-to-reassess' || !!activeIssue;
  let message='No inferred skill score. '+report.outcome.attempts+
    ' answer observation(s) for this selected concept.';
  if(activeIssue) {
    message=activeIssue.outcomeId===selectedId
      ? 'A different question was explicitly issued: '+activeIssue.questionId+
        '. Only its first response after issuance can count as issued evidence.'
      : 'A question is already issued for another concept. Return there to answer it.';
  } else if(lastVerification?.outcomeId===selectedId) {
    message='Verified first answer to an explicitly issued different question: '+
      (lastVerification.result.comparison.followupCorrect?'correct':'incorrect')+
      '. Durable mastery and teaching impact remain unknown.';
  }
  $('path-message').textContent=message;
}
function render() {
  renderTopics();
  const report=view();
  $('lesson-unit').textContent='02 / '+report.outcome.unitLabel.toUpperCase();
  $('source-pill').textContent=report.attribution.title;
  $('lesson-title').textContent=report.lesson?.title??'No linked editorial lesson';
  $('lesson-body').textContent=report.lesson?.bodyText??
    'This concept has no authored lesson. FARK will not invent instructional content.';
  renderVisual(report.lesson);
  renderQuestion(report.question);
  renderPath(report);
  $('answer-feedback').textContent=feedback;
}
function guarded(fn) {
  try {
    $('desk-error').hidden=true;
    fn();
  } catch(error) {
    $('desk-error').textContent='Cannot continue: '+error.message;
    $('desk-error').hidden=false;
  }
}
function submitAnswer(questionId,choiceId) {
  const at=nextTime();
  const attemptId='desk-a'+(++attemptSequence);
  const result=recordAssessment(imported.core,history,{
    attemptId,questionId,selectedChoiceId:choiceId,at
  });
  let verified=null;
  if(activeIssue && activeIssue.outcomeId===selectedId &&
      activeIssue.questionId===questionId) {
    verified=verifyIssuedReassessment(imported.core,result.history,issued,{
      issueId:activeIssue.id,followupAttemptId:attemptId,at:nextTime()
    });
    if(verified.status!=='verified-issued-answer') {
      throw new RangeError('issued first response was not verified: '+verified.status);
    }
  }
  history=result.history;
  feedback=result.attempt.correct
    ? 'Correct answer observed on this question. Mastery remains unknown.'
    : 'Incorrect answer observed on this question. This is not a diagnosis.';
  if(verified) {
    lastVerification={outcomeId:selectedId,result:verified};
    activeIssue=null;
    feedback+=' Different-question issuance and first response verified.';
  } else {
    lastVerification=null;
  }
  render();
}
function reviewLesson() {
  const report=view();
  if(report.path.status!=='teaching-needed'||!report.lesson||
      report.lesson.id!==report.path.resourceId) {
    throw new RangeError('no matching lesson to mark reviewed');
  }
  const completed=recordTeachingCompletion(imported.core,history,teaching,{
    completionId:'desk-c'+(++completionSequence),
    resourceId:report.path.resourceId,
    baselineAttemptId:report.path.baselineAttemptId,
    at:nextTime()
  });
  teaching=completed.history;
  feedback='Lesson-review completion was self-reported. Reading or learning was not independently verified.';
  render();
}
function issueDifferent() {
  const report=view();
  if(activeIssue) throw new RangeError('another question is already issued');
  if(report.path.status!=='ready-to-reassess' || !report.path.baselineAttemptId) {
    throw new RangeError('a reviewed lesson and an incorrect baseline are needed');
  }
  const output=issueReassessment(imported.core,history,teaching,issued,{
    issueId:'desk-i'+(++issueSequence),
    baselineAttemptId:report.path.baselineAttemptId,
    outcomeId:selectedId,at:nextTime()
  });
  if(output.status!=='issued') {
    throw new RangeError('no different, unattempted question can be issued: '+output.status);
  }
  issued=output.ledger;
  activeIssue=output.issue;
  feedback='Different, unanswered question issued. Your response can now be verified.';
  render();
}
function resetEvidence() {
  history=createAssessmentHistory();
  teaching=createTeachingHistory();
  issued=createReassessmentLedger();
  activeIssue=null;
  lastVerification=null;
  attemptSequence=0;
  completionSequence=0;
  issueSequence=0;
  lastMs=0;
  feedback='Answer, lesson-review and issuance observations cleared.';
  render();
}
function validateNewPack(source) {
  if(typeof source!=='string'||!source.trim()) throw new TypeError('paste content first');
  const parsed=source.trimStart().startsWith('{')
    ? importOpenContentPack(source)
    : importMarkdownContentPack(source);
  // Validate the actual lesson assembly BEFORE replacing in-memory content.
  buildStudyDeskView(parsed,createAssessmentHistory(),createTeachingHistory(),{
    outcomeId:parsed.core.outcomes[0].id,at:'2026-01-01T00:00:00.000Z'
  });
  return parsed;
}
function loadPack(source) {
  try {
    const parsed=validateNewPack(source);
    imported=parsed;
    selectedId=parsed.core.outcomes[0].id;
    resetEvidence();
    $('source-error').hidden=true;
    $('source-status').textContent='Course loaded: '+imported.attribution.title+
      '. '+imported.core.outcomes.length+' concept(s). Previous answers, reviews and issued questions cleared.';
  } catch(error) {
    $('source-error').textContent='Import rejected: '+error.message;
    $('source-error').hidden=false;
    $('source-status').textContent='Invalid content rejected. Previous valid course and evidence preserved.';
  }
}
$('review-lesson').addEventListener('click',()=>guarded(reviewLesson));
$('issue-different').addEventListener('click',()=>guarded(issueDifferent));
$('clear-session').addEventListener('click',()=>guarded(resetEvidence));
$('load-desk-source').addEventListener('click',()=>loadPack($('desk-source').value));
$('restore-desk-demo').addEventListener('click',()=>{
  loadPack(JSON.stringify(STUDY_DESK_SAMPLE));
  $('desk-source').value=NUMBER_LINE_SAMPLE;
  $('source-status').textContent='Original demo restored. Sample Markdown is ready to edit.';
});
$('desk-source').value=NUMBER_LINE_SAMPLE;
render();
