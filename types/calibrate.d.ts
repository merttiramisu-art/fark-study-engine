import type { MistakeReason, Rating, TimestampInput } from './index.js';
import type { LearningLedger } from './ledger.js';
import type { CalibrationReport, DsrLearnerParams } from './memory.js';

export interface ExternalReviewEvent {
  cardId: string;
  topic?: string;
  at: TimestampInput;
  rating: Rating;
  reason?: MistakeReason;
}

export interface NormalizedReviewEvent {
  cardId: string;
  topic: string;
  at: string;
  atMs: number;
  rating: Rating;
  reason?: MistakeReason;
}

export type ReplayStrategyId = 'balanced' | 'sm2' | 'dsr';

export interface ReplayStrategyReport extends CalibrationReport {
  strategy: ReplayStrategyId;
  timing: {
    earlyReviews: number;
    onWindowReviews: number;
    overdueReviews: number;
  };
}

export interface ReplayReport {
  totalEvents: number;
  distinctCards: number;
  dsrParams: Required<DsrLearnerParams>;
  strategies: ReplayStrategyReport[];
  caveat: string;
}

export interface FitParametersOptions {
  minSamples?: number;
  regularization?: number;
}

export interface FitParametersReport {
  fitted: boolean;
  improved: boolean;
  reason: 'calibrated' | 'baseline-already-optimal' | 'insufficient-scored-reviews';
  minRequired: number;
  sampleCount: number;
  params: Required<DsrLearnerParams>;
  baseline: ReplayStrategyReport;
  fittedResult: ReplayStrategyReport;
  brierDelta: number;
  logLossDelta: number;
  holdout: {
    sampleCount: number;
    baselineBrier: number;
    fittedBrier: number;
  } | null;
  caveat: string;
}

export function normalizeReviewEvents(
  input: LearningLedger | readonly ExternalReviewEvent[]
): NormalizedReviewEvent[];

export function parseReviewLogCsv(csvText: string): NormalizedReviewEvent[];

export function parseReviewLogJsonl(jsonlText: string): NormalizedReviewEvent[];

export function exportReviewLogCsv(input: LearningLedger | readonly ExternalReviewEvent[]): string;

export function replayReviewStream(
  input: LearningLedger | readonly ExternalReviewEvent[],
  options?: { strategies?: readonly ReplayStrategyId[]; dsrParams?: DsrLearnerParams }
): ReplayReport;

export function fitLearnerParameters(
  input: LearningLedger | readonly ExternalReviewEvent[],
  options?: FitParametersOptions
): FitParametersReport;
