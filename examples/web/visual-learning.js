/**
 * Offline Visual Learning Studio. All instructional material is displayed as
 * inert text. This app has no persistence, network calls or student evidence.
 */
import { importOpenContentPack } from '../../src/content-adapter.js';
import { importMarkdownContentPack } from '../../src/markdown-content.js';
import { buildNumberLineModel, buildTimelineModel } from '../../src/visual-learning.js';
import { NUMBER_LINE_SAMPLE, TIMELINE_SAMPLE } from './visual-learning-samples.js';

const $ = id => document.getElementById(id);
const buttons = ['sample-number-line','sample-timeline'];

function buildNumberLine(model) {
  const wrap = document.createElement('div');
  wrap.className = 'numberline-wrap';
  const list = document.createElement('ol');
  list.className = 'numberline-list';
  list.setAttribute('aria-label', model.summary);
  for (const tick of model.ticks) {
    const li = document.createElement('li');
    li.className = tick.selected ? 'numberline-tick selected' : 'numberline-tick';
    li.textContent = String(tick.value);
    list.append(li);
  }
  wrap.append(list);
  const note = document.createElement('p');
  note.className = 'marked-summary';
  note.textContent = 'Marked points: ' + model.points.join(', ');
  wrap.append(note);
  return wrap;
}
function buildTimeline(model) {
  const list = document.createElement('ol');
  list.className = 'timeline-list';
  list.setAttribute('aria-label', model.summary);
  for (const event of model.events) {
    const item = document.createElement('li');
    const year = document.createElement('div');
    year.className = 'event-year';
    year.textContent = String(event.year);
    const label = document.createElement('div');
    label.className = 'event-label';
    label.textContent = event.label;
    item.append(year, label);
    list.append(item);
  }
  return list;
}
function importSource(raw) {
  return raw.trimStart().startsWith('{')
    ? importOpenContentPack(raw)
    : importMarkdownContentPack(raw);
}
function preview() {
  try {
    const imported = importSource($('lesson-source').value);
    const lesson = imported.materials.lessons.find(row =>
      row.visual?.kind === 'number-line' || row.visual?.kind === 'timeline');
    if (!lesson) throw new RangeError('No supported number-line or timeline lesson found');
    const visual = lesson.visual;
    const model = visual.kind === 'number-line'
      ? buildNumberLineModel({min:visual.min,max:visual.max,points:visual.points})
      : buildTimelineModel({events:visual.events});
    // Construct the entire replacement off-screen before mutating visible state.
    const rendered = model.kind === 'number-line'
      ? buildNumberLine(model)
      : buildTimeline(model);
    $('visual-stage').replaceChildren(rendered);
    $('visual-summary').textContent = model.summary;
    $('lesson-heading').textContent = lesson.title;
    $('lesson-text').textContent = lesson.bodyText;
    $('content-provenance').textContent =
      imported.attribution.title + ' · ' + imported.attribution.creator +
      ' · ' + imported.attribution.license + ' (author-declared)';
    $('preview-status').textContent = 'Validated ' +
      imported.core.questions.length + ' question(s). ' +
      (visual.kind === 'timeline' ? 'Fictional chronology' : 'Number line') +
      ' is displayed locally.';
    $('preview-error').hidden = true;
    return true;
  } catch (error) {
    $('preview-error').textContent = 'Import rejected: ' + error.message;
    $('preview-error').hidden = false;
    $('preview-status').textContent = 'Previous valid visualization preserved.';
    return false;
  }
}
function sample(id, source) {
  $('lesson-source').value = source;
  const ok = preview();
  if (ok) {
    for (const key of buttons) {
      $(key).classList.toggle('active', key === id);
      $(key).setAttribute('aria-pressed', String(key === id));
    }
  }
}
$('preview-lesson').addEventListener('click', preview);
$('sample-number-line').addEventListener('click', () => sample('sample-number-line', NUMBER_LINE_SAMPLE));
$('sample-timeline').addEventListener('click', () => sample('sample-timeline', TIMELINE_SAMPLE));
sample('sample-number-line', NUMBER_LINE_SAMPLE);
