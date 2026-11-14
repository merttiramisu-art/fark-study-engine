import type { MistakeReason, NewCardInput, Rating, StudyCard, TimestampInput } from './index.js';
import type { DsrMemoryState } from './memory.js';

export interface ConceptNode {
  id: string;
  label: string;
  prerequisites: string[];
}

export interface LedgerCardEntry {
  id: string;
  topic: string;
  concepts: string[];
  question: string;
  answer: string;
  createdAt: string;
  importedSnapshot: StudyCard | null;
}

export interface LedgerReviewEvent {
  id: string;
  type: 'review';
  at: string;
  cardId: string;
  topic: string;
  concepts: string[];
  rating: Rating;
  reason?: MistakeReason;
  elapsedDays: number;
  predictedR: number | null;
  intervalDays: number;
  memoryAfter: DsrMemoryState;
}

export interface LedgerInterventionBaseline {
  targetReviews: number;
  targetRecallRate: number | null;
  targetMisconceptionRate: number | null;
  meanStabilityDays: number;
  controlReviews: number;
  controlRecallRate: number | null;
}

export interface LedgerInterventionEvent {
  id: string;
  type: 'intervention';
  at: string;
  targetTopic: string;
  targetConcepts: string[];
  signal: string;
  action: string;
  hypothesis: string;
  baseline: LedgerInterventionBaseline;
}

export type LedgerEvent = LedgerReviewEvent | LedgerInterventionEvent;

export interface LearningLedger {
  format: 'fark-study-ledger';
  version: 1;
  createdAt: string;
  concepts: Record<string, ConceptNode>;
  cards: Record<string, LedgerCardEntry>;
  events: LedgerEvent[];
}

export interface CreateLedgerOptions {
  cards?: readonly StudyCard[];
  concepts?: readonly { id: string; label?: string; prerequisites?: readonly string[] }[];
  createdAt?: TimestampInput;
}

export interface RecordLedgerReviewOptions {
  reason?: MistakeReason;
  targetRetention?: number;
  eventId?: string;
}

export declare const LEDGER_FORMAT: 'fark-study-ledger';
export declare const LEDGER_VERSION: 1;

export function validateLedger(ledger: LearningLedger): boolean;

export function createLedger(options?: CreateLedgerOptions): LearningLedger;

export function linkConceptPrerequisites(
  ledger: LearningLedger,
  conceptId: string,
  prerequisites?: readonly string[],
  label?: string
): LearningLedger;

export function upsertLedgerCard(
  ledger: LearningLedger,
  cardInput: NewCardInput | StudyCard,
  options?: { concepts?: readonly string[]; at?: TimestampInput }
): LearningLedger;

export function getCardMemoryState(ledger: LearningLedger, cardId: string): DsrMemoryState;

export function recordLedgerReview(
  ledger: LearningLedger,
  cardId: string,
  rating: Rating,
  at?: TimestampInput,
  options?: RecordLedgerReviewOptions
): { ledger: LearningLedger; event: LedgerReviewEvent; memory: DsrMemoryState };

export function projectCardsFromLedger(ledger: LearningLedger, at?: TimestampInput): StudyCard[];

export function exportLedger(ledger: LearningLedger): string;

export function importLedger(jsonText: string): LearningLedger;
