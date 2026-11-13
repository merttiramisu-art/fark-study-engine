import type { StudyCard } from './index.js';

export interface ExportCsvOptions {
  escapeFormulas?: boolean;
}

export interface ImportCsvOptions {
  idPrefix?: string;
}

export function exportStudyCsv(
  cards: readonly StudyCard[],
  options?: ExportCsvOptions
): string;

export function importStudyCsv(
  csvText: string,
  options?: ImportCsvOptions
): StudyCard[];
