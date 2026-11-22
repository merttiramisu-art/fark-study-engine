export declare const FRACTION_MAX_DENOMINATOR: 12;
export interface FractionModel {
  numerator: number;
  denominator: number;
  label: string;
  filled: boolean[];
  value: number;
}
export interface FractionComparison {
  left: FractionModel;
  right: FractionModel;
  symbol: '<' | '>' | '=';
  relation: -1 | 0 | 1;
  label: string;
  explanation: string;
  mastery: null;
}
export declare function createFractionModel(numerator: number, denominator: number): FractionModel;
export declare function compareFractionModels(
  left: {numerator: number; denominator: number},
  right: {numerator: number; denominator: number}
): FractionComparison;
/** Optional local-only KaTeX; falls back to plain, accessible text. */
export declare function renderOptionalKatex(
  target: { textContent: string | null; replaceChildren(...nodes: unknown[]): void },
  numerator: number,
  denominator: number,
  renderer?: { render(tex: string, element: unknown, options: Record<string, unknown>): void } | null
): 'native' | 'katex';
