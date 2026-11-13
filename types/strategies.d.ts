import type { MistakeReason, Rating, StudyCard, TimestampInput } from './index.js';

export type ReviewStrategyId = 'balanced' | 'gentle' | 'intensive' | 'sm2';

export declare const STRATEGY_IDS: readonly ReviewStrategyId[];

export interface ReviewStrategyDefinition {
  id: ReviewStrategyId;
  label: string;
  summary: string;
  againMinutes: number;
  hardHours: number;
  intervalsDays: number[];
  adaptive: boolean;
  disclaimer: string;
}

export interface StrategyReviewOptions {
  strategy?: ReviewStrategyId;
  reason?: MistakeReason;
  reasonAware?: boolean;
}

export type ComparisonStepInput =
  | Rating
  | {
      rating: Rating;
      reason?: MistakeReason;
    };

export interface CompareStrategiesOptions {
  startAt?: TimestampInput;
  strategies?: readonly ReviewStrategyId[];
}

export interface StrategyTimelineEntry {
  step: number;
  rating: Rating;
  reviewedAt: string;
  dueAt: string;
  intervalDays: number;
  box: number;
}

export interface StrategyComparisonRow {
  strategy: ReviewStrategyId;
  label: string;
  steps: number;
  finalBox: number;
  finalIntervalDays: number;
  totalSpanDays: number;
  timeline: StrategyTimelineEntry[];
}

export interface StrategyComparisonResult {
  startedAt: string;
  disclaimer: string;
  strategies: StrategyComparisonRow[];
}

export function listReviewStrategies(): ReviewStrategyDefinition[];

export function getReviewStrategy(strategyId?: ReviewStrategyId): ReviewStrategyDefinition;

export function reviewCardWithStrategy(
  card: StudyCard,
  rating: Rating,
  at?: TimestampInput,
  options?: StrategyReviewOptions
): StudyCard;

export type CohortProfileId = 'steady' | 'cramming' | 'missed-days';

export interface CohortSimulationOptions {
  cardsCount?: number;
  days?: number;
  dailyLimit?: number;
  profile?: CohortProfileId;
  seed?: number;
  strategies?: readonly ReviewStrategyId[];
}

export interface CohortStrategyResult {
  strategy: ReviewStrategyId;
  label: string;
  totalReviews: number;
  avgDailyReviews: number;
  peakDailyReviews: number;
  activeDays: number;
  simulatedRecallRate: number | null;
  finalDueBacklog: number;
  maturedCards: number;
}

export interface CohortSimulationResult {
  days: number;
  cardsCount: number;
  dailyLimit: number;
  profile: CohortProfileId;
  seed: number;
  disclaimer: string;
  results: CohortStrategyResult[];
}

export function compareStrategies(
  steps: readonly ComparisonStepInput[],
  options?: CompareStrategiesOptions
): StrategyComparisonResult;

export function simulateCohort(options?: CohortSimulationOptions): CohortSimulationResult;
