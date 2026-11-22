/**
 * In-memory interactive Concept Map. All edges are author-declared, and all
 * answer markers come from recordAssessment + summarizeAssessments.
 * No storage, network requests, learner profile or HTML evaluation.
 */
import { importOpenContentPack, OPEN_CONTENT_PACK_LIMITS } from '../../src/content-adapter.js';
import { importMarkdownContentPack } from '../../src/markdown-content.js';
import { createAssessmentHistory, recordAssessment } from '../../src/assessment.js';
import { createTeachingHistory, recordTeachingCompletion } from '../../src/learning-progress.js';
import { getConceptStudyPath } from '../../src/concept-study-path.js';
import { createReassessmentLedger, issueReassessment, verifyIssuedReassessment } from '../../src/reassessment-ledger.js';
import { buildConceptMap } from '../../src/concept-map.js';
import { CONCEPT_MAP_SAMPLE } from './concept-map-sample.js';
import { CONCEPT_AUTHORING_SAMPLE } from './concept-map-authoring-sample.js';

const $ = id => document.getElementById(id);
let { core, materials, attribution } = importOpenContentPack(CONCEPT_MAP_SAMPLE);
let history = createAssessmentHistory();
let attemptSequence = 0;
let selectedId = 'compare-fractions';
let questionId = 'q-compare';
let feedback = 'No answers recorded.';
let teaching = createTeachingHistory();
let issued = createReassessmentLedger();
let activeIssue = null;
let lastVerification = null;
let currentGuide = null;
let lastEventMs = 0;
let issueSequence = 0;
let completionSequence = 0;

function nextEventTime() {
  lastEventMs = Math.max(Date.now(), lastEventMs + 1);
  return new Date(lastEventMs).toISOString();
}
function pathMessage(message, error = false) {
  $('path-error').hidden = !error;
  if (error) $('path-error').textContent = message;
  else $('path-status').textContent = message;
}
function guardedPath(action) {
  try {
    $('path-error').hidden = true;
    action();
  } catch (error) {
    pathMessage('This step could not continue: ' + error.message, true);
  }
}


function evidenceLabel(node) {
  if (node.status === 'not-observed') return 'No answer yet';
  if (node.status === 'correct-observed') return 'Correct answer observed';
  if (node.status === 'incorrect-observed') return 'Incorrect answer observed';
  return 'Mixed answers observed';
}
function textNode(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}
function labeledList(id, identifiers, report) {
  const list = $(id);
  list.replaceChildren();
  if (!identifiers.length) {
    list.append(textNode('li', '', 'None declared'));
    return;
  }
  for (const target of identifiers) {
    const node = report.nodes.find(row => row.id === target);
    list.append(textNode('li', '', node ? node.label : target));
  }
}
function showSelected(report) {
  const node = report.nodes.find(row => row.id === selectedId) ?? report.nodes[0];
  if (!node) return;
  selectedId = node.id;
  $('selected-title').textContent = node.label;
  $('selected-unit').textContent = node.unitLabel;
  $('selected-evidence').textContent = evidenceLabel(node) + '. ' +
    node.attempts + ' observed answer(s): ' + node.correct + ' correct, ' +
    node.incorrect + ' incorrect.';
  $('mastery-warning').textContent = 'Mastery: unknown. ' +
    (node.attempts ? 'One or more answers do not prove durable learning.'
      : 'No answer does not mean failure.');
  labeledList('selected-prerequisites', node.prerequisiteIds, report);
  labeledList('selected-dependents', node.dependentIds, report);
}

function graph() {
  const report = buildConceptMap(core, history);
  const canvas = $('map-levels');
  canvas.replaceChildren();
  $('graph-count').textContent = report.nodes.length + ' concepts · ' +
    report.edges.length + ' declared links';
  report.levels.forEach((level, index) => {
    if (index) {
      const connector = textNode('div', 'layer-arrow', '↓');
      connector.setAttribute('aria-hidden','true');
      canvas.append(connector);
    }
    const layer = textNode('section','map-layer','');
    const label = textNode('div','layer-title','Prerequisite depth ' + level);
    layer.append(label);
    const group = textNode('div','layer-nodes','');
    for (const node of report.nodes.filter(item => item.level === level)) {
      const button = textNode('button', 'concept-node ' + node.status, '');
      button.type = 'button';
      button.dataset.concept = node.id;
      button.classList.toggle('selected',node.id === selectedId);
      button.setAttribute('aria-pressed',String(node.id === selectedId));
      button.append(
        textNode('span','concept-label',node.label),
        textNode('span','concept-unit',node.unitLabel),
        textNode('span','concept-observation',evidenceLabel(node)),
        textNode('span','concept-links',node.prerequisiteIds.length
          ? 'Requires: ' + node.prerequisiteIds.map(id =>
              report.nodes.find(other => other.id === id)?.label ?? id).join(', ')
          : 'No prerequisite declared')
      );
      button.addEventListener('click', () => {
        selectedId = node.id;
        if (node.questionIds.length) questionId = node.questionIds[0];
        graph();
      });
      group.append(button);
    }
    layer.append(group);
    canvas.append(layer);
  });
  showSelected(report);
  const exact = $('declared-links');
  exact.replaceChildren();
  if (!report.edges.length) {
    exact.append(textNode('li', '', 'No outcome prerequisites declared.'));
  } else {
    for (const edge of report.edges) {
      const from = report.nodes.find(n => n.id === edge.from);
      const to = report.nodes.find(n => n.id === edge.to);
      exact.append(textNode('li', '', from.label + ' → ' + to.label));
    }
  }
  $('quiz-feedback').textContent = feedback;
  $('excluded-report').textContent = report.excluded.staleAttemptIds.length ||
    report.excluded.orphanAttemptIds.length
    ? 'Excluded ' + report.excluded.staleAttemptIds.length +
      ' outdated answer(s) and ' + report.excluded.orphanAttemptIds.length +
      ' unmatched answer(s); neither counts toward concept evidence.'
    : 'No outdated or unmatched answers are included in this example.';
  quiz();
  showGuidedPlan();
}
function quiz() {
  const dropdown = $('question-select');
  dropdown.replaceChildren();
  for (const question of core.questions) {
    const option = document.createElement('option');
    option.value = question.id;
    option.textContent = materials.questions.find(item => item.id === question.id)?.prompt ?? question.id;
    dropdown.append(option);
  }
  dropdown.value = questionId;
  const chosen = core.questions.find(q => q.id === questionId);
  const material = materials.questions.find(q => q.id === questionId);
  $('quiz-prompt').textContent = material.prompt;
  const options = $('quiz-choices');
  options.replaceChildren();
  for (const choice of material.choices) {
    const button = textNode('button','',choice.text);
    button.type = 'button';
    button.dataset.choice = choice.id;
    button.addEventListener('click', () => {
      guardedPath(() => {
        const at = nextEventTime();
        const attemptId = 'example-a' + (++attemptSequence);
        const result = recordAssessment(core, history, {
          attemptId, questionId: chosen.id, selectedChoiceId: choice.id, at
        });
        let verification = null;
        if (activeIssue && chosen.id === activeIssue.questionId) {
          verification = verifyIssuedReassessment(core, result.history, issued, {
            issueId: activeIssue.id, followupAttemptId: attemptId, at: nextEventTime()
          });
          if (verification.status !== 'verified-issued-answer') {
            throw new RangeError('Issued question could not be verified: ' + verification.status);
          }
        }
        history = result.history;
        feedback = result.attempt.correct
          ? 'Correct answer observed on this question. Mastery is still unknown.'
          : 'Incorrect answer observed on this question. This is not a diagnosis.';
        if (verification) {
          lastVerification = { outcomeId: activeIssue.outcomeId, result: verification };
          activeIssue = null;
          feedback += ' A different, previously issued question was verified. Causal effect is unknown.';
        }
        selectedId = chosen.outcomeIds[0];
        graph();
      });
    });
    options.append(button);
  }
}
/**
 * Parse and build a complete replacement BEFORE mutating visible curriculum
 * or assessment history. Invalid content cannot corrupt a valid map.
 */
function compileCurriculum(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new TypeError('Paste a FARK Markdown or JSON content pack first');
  }
  const parsed = source.trimStart().startsWith('{')
    ? importOpenContentPack(source)
    : importMarkdownContentPack(source);
  const report = buildConceptMap(parsed.core, createAssessmentHistory());
  if (!report.nodes.length || !parsed.core.questions.length) {
    throw new RangeError('Content must include at least one outcome and a valid question');
  }
  return parsed;
}
function applyCurriculum(parsed) {
  core = parsed.core;
  materials = parsed.materials;
  attribution = parsed.attribution;
  history = createAssessmentHistory();
  teaching = createTeachingHistory();
  issued = createReassessmentLedger();
  activeIssue = null;
  lastVerification = null;
  lastEventMs = 0;
  attemptSequence = 0;
  completionSequence = 0;
  issueSequence = 0;
  selectedId = core.outcomes[0].id;
  questionId = core.questions[0].id;
  feedback = 'New curriculum loaded. Previous answer history cleared; no answers recorded.';
  graph();
  $('source-title').textContent = attribution.title;
  $('source-author').textContent = attribution.creator + ' · ' +
    attribution.license + ' (author-declared, not verified)';
  $('import-status').textContent = 'Validated ' + core.outcomes.length +
    ' concept(s), ' + core.outcomes.reduce((sum, o) =>
      sum + (o.prerequisiteIds?.length ?? 0), 0) +
    ' declared link(s) and ' + core.questions.length +
    ' question(s). Previous answers cleared.';
  $('import-error').hidden = true;
}
function tryImport(source) {
  try {
    const compiled = compileCurriculum(source);
    applyCurriculum(compiled);
  } catch (error) {
    $('import-error').textContent = 'Import rejected: ' + error.message;
    $('import-error').hidden = false;
    $('import-status').textContent =
      'Import rejected. The last valid graph and observations are unchanged.';
  }
}
$('import-content').addEventListener('click', () =>
  tryImport($('content-source').value));
$('restore-sample').addEventListener('click', () => {
  applyCurriculum(importOpenContentPack(CONCEPT_MAP_SAMPLE));
  $('content-source').value = CONCEPT_AUTHORING_SAMPLE;
  $('content-file').value = '';
  $('import-status').textContent =
    'Original fictional five-concept example restored. Answers cleared. Editable Markdown sample remains in the editor.';
});
$('content-file').addEventListener('change', async () => {
  const field = $('content-file');
  const file = field.files?.[0];
  if (!file) return;
  try {
    if (file.size > OPEN_CONTENT_PACK_LIMITS.maxBytes) {
      throw new RangeError('file exceeds the 1 MiB limit');
    }
    if (!/\.(?:md|markdown|json)$/i.test(file.name)) {
      throw new TypeError('select a .md, .markdown or .json file');
    }
    const input = await file.text();
    $('content-source').value = input;
    tryImport(input);
  } catch (error) {
    $('import-error').textContent = 'File rejected: ' + error.message;
    $('import-error').hidden = false;
    $('import-status').textContent =
      'Local file rejected. Existing concept map and answers remain unchanged.';
  } finally {
    field.value = '';
  }
});


function showGuidedPlan() {
  const path = getConceptStudyPath(core, history, teaching, {
    at: new Date(Math.max(Date.now(), lastEventMs)).toISOString(),
    outcomeId: selectedId
  });
  currentGuide = path;
  $('path-heading').textContent = 'Next step for: ' + path.outcomeLabel;
  $('path-reason').textContent = path.reason;
  const prereqs = $('path-prerequisites');
  prereqs.replaceChildren();
  if (!path.prerequisites.length) {
    prereqs.append(textNode('li', '', 'No prerequisites declared for this concept.'));
  } else {
    for (const item of path.prerequisites) {
      const label = item.status === 'not-observed' ? 'no answer recorded' :
        item.status === 'mixed-observations' ? 'mixed answers observed' :
        item.status === 'incorrect-observed' ? 'incorrect answer observed' :
        'correct answer observed';
      prereqs.append(textNode('li', '', item.label + ': ' + label +
        ' (' + item.observedAttempts + ' answer(s); mastery unknown)'));
    }
  }
  const lesson = path.resourceId
    ? materials.lessons.find(row => row.id === path.resourceId) : null;
  const showLesson = path.status === 'teaching-needed' && !!lesson;
  $('path-lesson').hidden = !showLesson;
  if (showLesson) {
    $('path-lesson-title').textContent = lesson.title;
    $('path-lesson-body').textContent = lesson.bodyText;
  }
  $('issue-check').hidden = path.status !== 'ready-to-reassess' || !!activeIssue;
  let status = path.status === 'first-question' && path.questionId
    ? 'Start with an unanswered question to establish an observation. Choose it from the question selector.'
    : 'Next step: ' + path.nextAction + '. No mastery inferred.';
  if (activeIssue) {
    status = activeIssue.outcomeId === selectedId
      ? 'Different question explicitly issued: ' + activeIssue.questionId +
        '. Its first answer after issuance can be verified. Mastery is unknown.'
      : 'A different-question check is already issued for another concept. Answer it before issuing a new check.';
  } else if (lastVerification && lastVerification.outcomeId === selectedId) {
    status = 'Verified first response to an explicitly issued, distinct question: ' +
      (lastVerification.result.comparison.followupCorrect ? 'correct' : 'incorrect') +
      '. Mastery unknown; teaching impact not established.';
  }
  $('path-status').textContent = status;
}
function markLessonReviewed() {
  const path = currentGuide;
  if (!path || path.outcomeId !== selectedId || path.status !== 'teaching-needed' ||
      !path.resourceId || !materials.lessons.some(row => row.id === path.resourceId)) {
    throw new RangeError('No matching editable lesson for this observed error');
  }
  const recorded = recordTeachingCompletion(core, history, teaching, {
    completionId: 'map-lesson-' + (++completionSequence),
    resourceId: path.resourceId, baselineAttemptId: path.baselineAttemptId,
    at: nextEventTime()
  });
  teaching = recorded.history;
  lastVerification = null;
  graph();
  $('path-status').textContent = 'Lesson review self-reported, not verified. The engine will only issue a different question if one is available.';
}
function issueDifferentQuestion() {
  const path = currentGuide;
  if (activeIssue) throw new RangeError('Another issued question is still awaiting its first answer');
  if (!path || path.outcomeId !== selectedId || path.status !== 'ready-to-reassess') {
    throw new RangeError('A reviewed lesson and an incorrect baseline are required');
  }
  const output = issueReassessment(core, history, teaching, issued, {
    issueId: 'map-check-' + (++issueSequence),
    baselineAttemptId: path.baselineAttemptId,
    outcomeId: path.outcomeId,
    at: nextEventTime()
  });
  if (output.status !== 'issued') {
    throw new RangeError('Cannot issue a different question: ' + output.status);
  }
  issued = output.ledger;
  activeIssue = output.issue;
  lastVerification = null;
  questionId = output.issue.questionId;
  graph();
}
$('mark-reviewed').addEventListener('click', () => guardedPath(markLessonReviewed));
$('issue-check').addEventListener('click', () => guardedPath(issueDifferentQuestion));

$('question-select').addEventListener('change', () => {
  questionId = $('question-select').value;
  quiz();
});
$('reset-evidence').addEventListener('click', () => {
  history = createAssessmentHistory();
  teaching = createTeachingHistory();
  issued = createReassessmentLedger();
  activeIssue = null;
  lastVerification = null;
  attemptSequence = 0;
  completionSequence = 0;
  issueSequence = 0;
  lastEventMs = 0;
  feedback = 'Answer and lesson-review histories cleared. No observations are recorded.';
  graph();
});
$('content-source').value = CONCEPT_AUTHORING_SAMPLE;
graph();
