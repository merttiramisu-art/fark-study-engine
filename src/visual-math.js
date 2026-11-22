/**
 * FARK Visual Math — bounded, content-agnostic fraction comparison model.
 * Pure, deterministic, dependency-free and independent of student evidence.
 * Optional KaTeX is an injected UI adapter, NEVER a required dependency.
 */
export const FRACTION_MAX_DENOMINATOR = 12;

export function createFractionModel(numerator, denominator) {
  if (!Number.isSafeInteger(denominator) || denominator < 1 ||
      denominator > FRACTION_MAX_DENOMINATOR) {
    throw new RangeError('denominator must be an integer from 1 to 12');
  }
  if (!Number.isSafeInteger(numerator) || numerator < 0 || numerator > denominator) {
    throw new RangeError('numerator must be an integer between 0 and denominator');
  }
  return {
    numerator,
    denominator,
    label: numerator + '/' + denominator,
    // Each slice represents an equal part of the SAME sized whole.
    filled: Array.from({ length: denominator }, (_, i) => i < numerator),
    value: numerator / denominator
  };
}

export function compareFractionModels(leftInput, rightInput) {
  const left = createFractionModel(leftInput.numerator, leftInput.denominator);
  const right = createFractionModel(rightInput.numerator, rightInput.denominator);
  const leftCross = left.numerator * right.denominator;
  const rightCross = right.numerator * left.denominator;
  const relation = Math.sign(leftCross - rightCross);
  const symbol = relation > 0 ? '>' : relation < 0 ? '<' : '=';
  return {
    left, right, symbol, relation,
    label: left.label + ' ' + symbol + ' ' + right.label,
    // Evidence from exact integer arithmetic, not a learning outcome estimate.
    explanation: left.label + ' ' + symbol + ' ' + right.label +
      ' because ' + leftCross + ' ' + symbol + ' ' + rightCross +
      ' after multiplying across the denominators.',
    mastery: null
  };
}

/**
 * Render only a bounded numeric TeX expression, or leave a native accessible
 * text fallback. The caller explicitly provides a locally loaded KaTeX
 * renderer; no CDN/network lookup, bundled code or license assets.
 */
export function renderOptionalKatex(target, numerator, denominator, renderer = null) {
  const fraction = createFractionModel(numerator, denominator);
  if (!target || typeof target.replaceChildren !== 'function' ||
      !('textContent' in target)) {
    throw new TypeError('target must be a DOM-like element');
  }
  target.replaceChildren();
  target.textContent = fraction.label;
  if (!renderer || typeof renderer.render !== 'function') return 'native';
  try {
    renderer.render(
      '\\frac{' + numerator + '}{' + denominator + '}',
      target,
      {
        displayMode: false,
        throwOnError: true,
        strict: 'error',
        trust: false,
        output: 'htmlAndMathml',
        maxExpand: 100
      }
    );
    return 'katex';
  } catch {
    target.replaceChildren();
    target.textContent = fraction.label;
    return 'native';
  }
}
