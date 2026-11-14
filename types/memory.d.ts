import type { MistakeReason, Rating, TimestampInput } from './index.js';

export interface DsrMemoryState {
  stabilityDays: number;
  difficulty: number;
  lastReviewedAt: string | null;
  dueAt: string | null;
  reps: number;
  lapses: number;
}

export interface DsrLearnerParams {
  initialStabilityScale?: number;
  stabilityGainScale?: number;
}

export interface DsrUpdateOptions {
  reason?: MistakeReason;
  targetRetention?: number;
  params?: DsrLearnerParams;
}

export interface DsrUpdateResult {
  state: DsrMemoryState;
  elapsedDays: number;
  predictedR: number | null;
  intervalDays: number;
}

export interface CalibrationSample {
  predictedR: number | null;
  recalled: boolean | 0 | 1;
}

export interface CalibrationBin {
  range: string;
  count: number;
  meanPredictedR: number | null;
  observedRecallRate: number | null;
  calibrationGap: number | null;
}

export interface CalibrationReport {
  sampleCount: number;
  unscoredCount: number;
  meanPredictedR: number | null;
  observedRecallRate: number | null;
  brierScore: number | null;
  logLoss: number | null;
  bins: CalibrationBin[];
}

export declare const DSR_DEFAULTS: Readonly<{
  minDifficulty: number;
  maxDifficulty: number;
  defaultDifficulty: number;
  minStabilityDays: number;
  maxStabilityDays: number;
  defaultTargetRetention: number;
  powerDecayFactor: number;
  defaultInitialStabilityScale: number;
  defaultStabilityGainScale: number;
}>;

export function createMemoryState(): DsrMemoryState;

export function computeRetrievability(elapsedDays: number, stabilityDays: number): number | null;

export function computeOptimalIntervalDays(stabilityDays: number, targetRetention?: number): number;

export function updateDsrMemory(
  state: DsrMemoryState,
  rating: Rating,
  at?: TimestampInput,
  options?: DsrUpdateOptions
): DsrUpdateResult;

export function evaluatePredictionCalibration(samples: readonly CalibrationSample[]): CalibrationReport;
