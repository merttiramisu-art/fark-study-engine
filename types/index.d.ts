export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type MistakeReason = 'knowledge-gap' | 'misconception' | 'attention' | 'other';

export type TimestampInput = Date | string | number;

export declare const MISTAKE_REASONS: readonly MistakeReason[];

export interface NewCardInput {
  id: string;
  topic: string;
  question: string;
  answer: string;
}

export interface StudyCard {
  id: string;
  topic: string;
  question: string;
  answer: string;
  box: number;
  dueAt: string | null;
  lastReviewedAt: string | null;
  reviews: number;
  correct: number;
  lapses: number;
  reasonCounts?: Partial<Record<MistakeReason, number>>;
}

export interface ReviewOptions {
  reason?: MistakeReason;
}

export interface StudySummary {
  total: number;
  new: number;
  due: number;
  studied: number;
  mature: number;
  totalReviews: number;
  correctReviews: number;
  accuracy: number | null;
}

export interface TopicSummary extends StudySummary {
  topic: string;
}

export interface MistakeBreakdown {
  totalLapses: number;
  classified: number;
  unspecified: number;
  byReason: Record<MistakeReason, number>;
}

export interface ForecastDay {
  day: number;
  from: string;
  to: string;
  dueCount: number;
  byTopic: Record<string, number>;
}

export interface ReviewForecast {
  asOf: string;
  days: number;
  total: number;
  dueNow: number;
  unreviewed: number;
  later: number;
  schedule: ForecastDay[];
}

export function createCard(input: NewCardInput): StudyCard;

export function reviewCard(
  card: StudyCard,
  rating: Rating,
  at?: TimestampInput,
  options?: ReviewOptions
): StudyCard;

export function selectReviewQueue(
  cards: readonly StudyCard[],
  at?: TimestampInput,
  limit?: number
): StudyCard[];

export function getStudySummary(
  cards: readonly StudyCard[],
  at?: TimestampInput
): StudySummary;

export function getTopicSummaries(
  cards: readonly StudyCard[],
  at?: TimestampInput
): TopicSummary[];

export function getMistakeBreakdown(
  cards: readonly StudyCard[]
): MistakeBreakdown;

export function validateDeck(cards: readonly StudyCard[]): true;

export function getReviewForecast(
  cards: readonly StudyCard[],
  at?: TimestampInput,
  days?: number
): ReviewForecast;
