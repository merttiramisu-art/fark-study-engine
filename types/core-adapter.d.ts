import type { KnowledgeCore } from './knowledge-core.js';
import type { ContentReadinessAudit } from './content-readiness.js';

export interface CoreAdapterOptions {
  defaultUnitTitle?: string;
  defaultOutcomeTitle?: string;
}

export interface CoreAdapterResult {
  core: KnowledgeCore;
  readiness: ContentReadinessAudit;
  stats: {
    units: number;
    outcomes: number;
    questions: number;
    resources: number;
    readyOutcomes: number;
  };
  warnings: string[];
}

export declare const SAMPLE_CORE_MARKDOWN: Readonly<{
  en: string;
  tr: string;
}>;

export function parseMarkdownToKnowledgeCore(
  markdownText: string,
  options?: CoreAdapterOptions
): CoreAdapterResult;

export function parseCsvToKnowledgeCore(csvText: string): CoreAdapterResult;
