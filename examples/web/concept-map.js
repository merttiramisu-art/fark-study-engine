/**
 * In-memory interactive Concept Map. All edges are author-declared, and all
 * answer markers come from recordAssessment + summarizeAssessments.
 * No storage, network requests, learner profile or HTML evaluation.
 */
import { importOpenContentPack, OPEN_CONTENT_PACK_LIMITS } from '../../src/content-adapter.js';
import { importMarkdownContentPack } from '../../src/markdown-content.js';
import { createAssessmentHistory, recordAssessment } from '../../src/assessment.js';
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
      const result = recordAssessment(core,history,{
        attemptId:'example-a'+(++attemptSequence),questionId:chosen.id,
        selectedChoiceId:choice.id,at:new Date().toISOString()
      });
      history = result.history;
      feedback = result.attempt.correct
        ? 'Correct answer observed on this question. Mastery is still unknown.'
        : 'Incorrect answer observed on this question. This is not a diagnosis.';
      selectedId = chosen.outcomeIds[0];
      graph();
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
  attemptSequence = 0;
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

$('question-select').addEventListener('change', () => {
  questionId = $('question-select').value;
  quiz();
});
$('reset-evidence').addEventListener('click', () => {
  history = createAssessmentHistory();
  attemptSequence = 0;
  feedback = 'Answer history cleared. No observations are recorded.';
  graph();
});
$('content-source').value = CONCEPT_AUTHORING_SAMPLE;
graph();
