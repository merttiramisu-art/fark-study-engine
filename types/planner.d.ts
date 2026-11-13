import type { StudyCard, TimestampInput } from './index.js';

export type SelectionReasonCode =
  | 'new-card'
  | 'scheduled-review'
  | 'overdue'
  | 'previous-mistakes';

export interface PlanOptions {
  limit?: number;
  maxPerTopic?: number;
  maxNewCards?: number;
}

export interface PlannedCardItem {
  id: string;
  topic: string;
  status: 'new' | 'review';
  dueAt: string | null;
  previousMistakes: number;
  reasonCodes: SelectionReasonCode[];
}

export interface StudyPlan {
  planned: PlannedCardItem[];
  dueCount: number;
  plannedCount: number;
  deferredCount: number;
  newCardsPlanned: number;
  perTopic: Record<string, number>;
}

export function planStudySession(
  cards: readonly StudyCard[],
  at?: TimestampInput,
  options?: PlanOptions
): StudyPlan;
