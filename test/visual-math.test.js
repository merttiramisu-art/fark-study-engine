import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRACTION_MAX_DENOMINATOR, createFractionModel,
  compareFractionModels, renderOptionalKatex
} from '../src/visual-math.js';

test('V6 Visual Math models equal whole subdivisions without changing input', () => {
  const fraction = createFractionModel(2, 5);
  assert.deepEqual(fraction.filled, [true, true, false, false, false]);
  assert.equal(fraction.label, '2/5');
  assert.equal(fraction.value, 0.4);
  assert.equal(FRACTION_MAX_DENOMINATOR, 12);
  const original = {numerator: 1, denominator: 3};
  const a = compareFractionModels(original, {numerator: 1, denominator: 4});
  assert.equal(a.symbol, '>');
  assert.equal(a.relation, 1);
  assert.equal(a.label, '1/3 > 1/4');
  assert.equal(a.mastery, null);
  assert.deepEqual(original, {numerator: 1, denominator: 3});
});

test('V6 Visual Math comparisons use exact cross products with equal and zero cases', () => {
  for (const [left, right, expected] of [
    [[2, 5], [2, 7], '>'],
    [[1, 2], [2, 4], '='],
    [[0, 4], [0, 12], '='],
    [[0, 2], [1, 12], '<'],
    [[5, 6], [4, 5], '>'],
    [[3, 4], [4, 5], '<']
  ]) {
    const report = compareFractionModels(
      {numerator:left[0], denominator:left[1]},
      {numerator:right[0], denominator:right[1]}
    );
    assert.equal(report.symbol, expected);
    assert.equal(report.left.filled.length, left[1]);
    assert.equal(report.right.filled.length, right[1]);
    assert.ok(report.explanation.includes(expected));
  }
});

test('V6 Visual Math refuses unsupported and unsafe fraction values', () => {
  for (const [n, d] of [[1,0], [1,-2], [13,13], [0,13], [2,1], [-1,3],
    [1.5,3], [1,2.5], [Number.NaN, 3], [Infinity,3], ['1',3], [1,'3']]) {
    assert.throws(() => createFractionModel(n,d), /numerator|denominator/);
  }
});

test('V6 Visual Math native output works without KaTeX, network or DOM markup', () => {
  const target = {
    textContent: '',
    replaceChildren() { this.textContent = ''; }
  };
  assert.equal(renderOptionalKatex(target, 1, 3), 'native');
  assert.equal(target.textContent, '1/3');
});

test('V6 Visual Math passes only bounded numeric TeX with strict untrusted KaTeX options', () => {
  const target = {textContent:'', replaceChildren() {this.textContent='';}};
  const calls = [];
  const renderer = {render(tex, element, options) {
    calls.push({tex,options});
    element.textContent = '[local render]';
  }};
  assert.equal(renderOptionalKatex(target, 2, 7, renderer), 'katex');
  assert.equal(target.textContent, '[local render]');
  assert.equal(calls[0].tex, '\\frac{2}{7}');
  assert.equal(calls[0].options.trust, false);
  assert.equal(calls[0].options.strict, 'error');
  assert.equal(calls[0].options.throwOnError, true);
  assert.equal(calls[0].options.output, 'htmlAndMathml');
});

test('V6 Visual Math failed local renderer reverts to a safe text fallback', () => {
  const target = {
    textContent: '',
    replaceChildren() { this.textContent = ''; }
  };
  assert.equal(renderOptionalKatex(target, 3, 4, {
    render(_tex, element) {
      element.textContent = '<script>unsafe</script>';
      throw new Error('invalid formula');
    }
  }), 'native');
  assert.equal(target.textContent, '3/4');
  assert.throws(() => renderOptionalKatex(null, 1, 2), /target/);
});
