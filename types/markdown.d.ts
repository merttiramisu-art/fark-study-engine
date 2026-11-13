import type { StudyCard } from './index.js';

export interface ExportMarkdownOptions {
  title?: string;
  includeStats?: boolean;
  collapsibleAnswers?: boolean;
}

export interface ImportMarkdownOptions {
  defaultTopic?: string;
  idPrefix?: string;
}

export function exportStudyMarkdown(
  cards: readonly StudyCard[],
  options?: ExportMarkdownOptions
): string;

export function importStudyMarkdown(
  markdownText: string,
  options?: ImportMarkdownOptions
): StudyCard[];
