/**
 * Visual Math Lab: original fraction visuals, no persistence or event recording.
 * Only bounded numeric TeX is passed to an optional local KaTeX renderer.
 */
import { compareFractionModels, renderOptionalKatex } from '../../src/visual-math.js';
import { importOpenContentPack } from '../../src/content-adapter.js';
import { importMarkdownContentPack } from '../../src/markdown-content.js';
const $ = id => document.getElementById(id);
const presetIds = ['preset-unit', 'preset-followup', 'preset-equal'];
const controls = ['left-num', 'left-den', 'right-num', 'right-den'];

function fractionInputs(side) {
  const denominator = Number($(side + '-den').value);
  const numerator = Math.min(denominator, Number($(side + '-num').value));
  $(side + '-num').max = String(denominator);
  $(side + '-num').value = String(numerator);
  $(side + '-num-out').textContent = String(numerator);
  $(side + '-den-out').textContent = String(denominator);
  return { numerator, denominator };
}

function buildBar(side, model) {
  const bar = $(side + '-bar');
  bar.replaceChildren();
  bar.style.gridTemplateColumns = 'repeat(' + model.denominator + ', minmax(0, 1fr))';
  bar.setAttribute('aria-label', model.numerator + ' of ' + model.denominator + ' equal parts shaded');
  model.filled.forEach(isFilled => {
    const segment = document.createElement('span');
    segment.className = isFilled ? 'fraction-cell filled' : 'fraction-cell';
    segment.setAttribute('aria-hidden', 'true');
    bar.append(segment);
  });
}

function refresh() {
  const comparison = compareFractionModels(fractionInputs('left'), fractionInputs('right'));
  buildBar('left', comparison.left);
  buildBar('right', comparison.right);
  // This page does not bundle KaTeX. A deployer may inject an already loaded
  // locally licensed KaTeX instance as window.katex. Without it, the text
  // fallback is accessible and fully functional, with no remote requests.
  const localKatex = typeof window.katex === 'object' ? window.katex : null;
  const l = renderOptionalKatex($('left-math'), comparison.left.numerator, comparison.left.denominator, localKatex);
  const r = renderOptionalKatex($('right-math'), comparison.right.numerator, comparison.right.denominator, localKatex);
  $('math-renderer-status').textContent = l === 'katex' && r === 'katex'
    ? 'Rendered by an explicitly provided local KaTeX instance.'
    : 'Native readable math — no additional library required.';
  $('visual-result').textContent = comparison.label;
  $('visual-explanation').textContent = comparison.explanation;
  presetIds.forEach(id => {
    $(id).classList.remove('active');
    $(id).setAttribute('aria-pressed', 'false');
  });
  return comparison;
}
function setPreset(id, values) {
  for (const [key, value] of Object.entries(values)) $(key).value = String(value);
  refresh();
  $(id).classList.add('active');
  $(id).setAttribute('aria-pressed', 'true');
}
const presets = [
  ['preset-unit', { 'left-num': 1, 'left-den': 3, 'right-num': 1, 'right-den': 4 }],
  ['preset-followup', { 'left-num': 2, 'left-den': 5, 'right-num': 2, 'right-den': 7 }],
  ['preset-equal', { 'left-num': 1, 'left-den': 2, 'right-num': 2, 'right-den': 4 }]
];
presets.forEach(([id, values]) => $(id).addEventListener('click', () => setPreset(id, values)));
controls.forEach(id => $(id).addEventListener('input', () => refresh()));
setPreset(...presets[0]);

/**
 * Authoring preview uses the exact same validation boundary as FARK's public
 * packages. Failure is atomic: no model/UI values change on invalid input.
 * Only inert text is rendered, never author-controlled HTML.
 */
function previewAuthoredContent() {
  const field = $('content-source');
  try {
    const text = field.value;
    const imported = text.trimStart().startsWith('{')
      ? importOpenContentPack(text)
      : importMarkdownContentPack(text);
    const lesson = imported.materials.lessons.find(item =>
      item.visual?.kind === 'fraction-comparison');
    if (!lesson) throw new RangeError('No lesson defines a supported fraction-comparison visual');
    const visual = lesson.visual;
    // Fully validate before changing any currently displayed content.
    compareFractionModels(visual.left, visual.right);
    const values = {
      'left-num': visual.left.numerator,
      'left-den': visual.left.denominator,
      'right-num': visual.right.numerator,
      'right-den': visual.right.denominator
    };
    for (const [key,value] of Object.entries(values)) $(key).value = String(value);
    refresh();
    $('authored-title').textContent = lesson.title;
    $('authored-body').textContent = lesson.bodyText;
    $('authored-source').textContent = imported.attribution.title +
      ' · ' + imported.attribution.creator + ' · ' + imported.attribution.license;
    $('authored-preview').hidden = false;
    $('content-error').hidden = true;
    $('content-feedback').textContent = 'Validated ' +
      imported.core.questions.length + ' question(s) and linked visual ' +
      $('visual-result').textContent + '. Content remains in memory.';
  } catch (error) {
    $('content-error').textContent = 'Cannot preview this content: ' + error.message;
    $('content-error').hidden = false;
    $('content-feedback').textContent = 'Import rejected. The previous valid visual remains visible.';
  }
}
$('load-visual-content').addEventListener('click', previewAuthoredContent);
