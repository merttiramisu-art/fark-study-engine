export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type ConfidenceOutcomeSignal =
  | 'hypercorrection-alert'
  | 'lucky-guess'
  | 'calibrated-high'
  | 'acknowledged-gap'
  | 'developing-correct'
  | 'developing-miss';

export interface ConfidenceObservation {
  confidence: ConfidenceLevel;
  correct: boolean;
  outcomeId?: string;
  at?: string;
  misconceptionId?: string;
}

export interface CalibrationBucket {
  level: ConfidenceLevel;
  expectedAccuracy: number;
  count: number;
  correctCount: number;
  observedAccuracy: number | null;
  calibrationGap: number | null;
}

export interface MetacognitiveCalibrationReport {
  totalRecords: number;
  overallAccuracy: number | null;
  ece: number | null;
  brierScore: number | null;
  biasLabel: 'insufficient-data' | 'overconfident' | 'underconfident' | 'well-calibrated';
  hypercorrectionCount: number;
  luckyGuessCount: number;
  acknowledgedGapCount: number;
  hypercorrectionOutcomes: string[];
  luckyGuessOutcomes: string[];
  buckets: CalibrationBucket[];
  limitations: string;
}

export interface ForecastItemInput {
  id: string;
  label?: string;
  stabilityDays: number;
  difficulty?: number;
  lastReviewedAt?: string | null;
  elapsedDays?: number;
}

export interface ForecastHorizonOptions {
  horizonDays?: number;
  retentionThreshold?: number;
  criticalThreshold?: number;
  simulateTodayReviews?: number;
  at?: string | Date;
}

export interface ForecastDayEntry {
  dayOffset: number;
  dateIso: string;
  atRiskCount: number;
  criticalCount: number;
  newCrossings: number;
  meanRetrievability: number | null;
  atRiskIds: string[];
  simulatedAtRiskCount: number;
  simulatedNewCrossings: number;
}

export interface ForgettingHorizonReport {
  horizonDays: number;
  retentionThreshold: number;
  criticalThreshold: number;
  itemCount: number;
  simulateTodayReviews: number;
  peakAtRiskDay: number;
  peakAtRiskCount: number;
  avoidedAtRiskAtDay7: number;
  avoidedAtRiskAtHorizon: number;
  totalRiskDaysAvoided: number;
  days: ForecastDayEntry[];
}

export declare const CONFIDENCE_LEVELS: readonly ConfidenceLevel[];
export declare const CONFIDENCE_PROBABILITY: Readonly<Record<ConfidenceLevel, number>>;

export function classifyConfidenceOutcome(confidence: ConfidenceLevel, correct: boolean): ConfidenceOutcomeSignal;

export function analyzeMetacognitiveCalibration(records: readonly ConfidenceObservation[]): MetacognitiveCalibrationReport;

export function forecastForgettingHorizon(
  items: readonly ForecastItemInput[],
  options?: ForecastHorizonOptions
): ForgettingHorizonReport;
