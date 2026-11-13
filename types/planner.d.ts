import type { StudyCard, TimestampInput } from './index.js';

export type SelectionReasonCode =
  | 'new-card'
  | 'scheduled-review'
  | 'overdue'
  | 'previous-mistakes'
  | 'concept-misconception'
  | 'knowledge-gap'
  | 'attention-slip';

export interface PlanOptions {
  limit?: number;
  maxPerTopic?: number;
  maxNewCards?: number;
  reasonAware?: boolean;
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

export interface StudyRecommendation {
  topic: string;
  signal: 'revisit-concepts' | 'fill-missing-facts' | 'slow-down-reading' | 'clear-backlog';
  due: number;
  total: number;
  message: string;
}

export function planStudySession(
  cards: readonly StudyCard[],
  at?: TimestampInput,
  options?: PlanOptions
): StudyPlan;

export function getStudyRecommendations(
  cards: readonly StudyCard[],
  at?: TimestampInput
): StudyRecommendation[];
