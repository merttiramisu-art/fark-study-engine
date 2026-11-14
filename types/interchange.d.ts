import type { StudyCard, TimestampInput } from './index.js';

export type SamplePackId = 'starter' | 'computer-science' | 'biology' | 'language' | 'english';

export interface SamplePackMetadata {
  id: SamplePackId;
  label: string;
  description: string;
}

export interface ConceptNodeInput {
  id: string;
  label: string;
  prerequisites: string[];
}

export interface ClozePromptInfo {
  isCloze: boolean;
  maskedQuestion: string;
  targets: string[];
  hints: string[];
  revealedText: string;
}

export interface ReversedStudyCard extends StudyCard {
  isReversed: true;
}

export interface TsvExportOptions {
  includeHeader?: boolean;
}

export interface TsvImportOptions {
  defaultTopic?: string;
  idPrefix?: string;
}

export declare const SAMPLE_PACKS: readonly SamplePackMetadata[];

export declare const DEFAULT_CONCEPT_LINKS: Readonly<Record<string, readonly string[]>>;

export function buildConceptNodesForCards(
  cards: readonly StudyCard[],
  extraLinks?: Readonly<Record<string, readonly string[]>>
): ConceptNodeInput[];

export function parseClozePrompt(question: string, fallbackAnswer?: string): ClozePromptInfo;

export function reverseCardPrompt(card: StudyCard): ReversedStudyCard;

export function exportStudyTsv(cards: readonly StudyCard[], options?: TsvExportOptions): string;

export function importStudyTsv(tsvText: string, options?: TsvImportOptions): StudyCard[];

export function buildSamplePack(packId?: SamplePackId, referenceDate?: TimestampInput): StudyCard[];
