import type { TimestampInput } from './index.js';
import type { CalibrationReport } from './memory.js';
import type { LearningLedger, LedgerInterventionEvent } from './ledger.js';

export type DiagnosisSignal =
  | 'fix-prerequisite'
  | 'resolve-misconception'
  | 'rescue-fading-memory'
  | 'slow-down-reading'
  | 'consolidate-backlog';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type InterventionVerdict =
  | 'insufficient-data'
  | 'positive-signal'
  | 'mixed-or-neutral'
  | 'no-improvement-reassess';

export interface ConceptDynamics {
  conceptId: string;
  label: string;
  prerequisites: string[];
  cardCount: number;
  dueCount: number;
  totalEvents: number;
  combinedReviews: number;
  overallRecallRate: number | null;
  recentRecallRate: number | null;
  recentMisconceptionCount: number;
  recentMisconceptionRate: number | null;
  recentAttentionCount: number;
  trend: 'improving' | 'declining' | 'steady' | 'insufficient-history';
  trendDelta: number | null;
  meanRetrievability: number | null;
  meanStabilityDays: number | null;
  meanDifficulty: number | null;
  lowRecallCardIds: string[];
}

export interface LearnerRecommendation {
  signal: DiagnosisSignal;
  priority: number;
  confidence: ConfidenceLevel;
  targetTopic: string;
  targetConcepts: string[];
  prerequisiteConcept?: string;
  headline: string;
  recommendedAction: string;
  hypothesis: string;
  evidence: Record<string, unknown>;
}

export interface LearnerDiagnosisReport {
  evaluatedAt: string;
  concepts: Record<string, ConceptDynamics>;
  recommendations: LearnerRecommendation[];
  calibration: CalibrationReport;
}

export interface InterventionProposal {
  id?: string;
  targetTopic: string;
  targetConcepts?: readonly string[];
  signal?: string;
  recommendedAction?: string;
  action?: string;
  hypothesis?: string;
}

export interface InterventionEvaluation {
  interventionId: string;
  targetTopic: string;
  signal: string;
  action: string;
  hypothesis: string;
  recordedAt: string;
  evaluatedAt: string;
  followUpTargetReviews: number;
  followUpControlReviews: number;
  baseline: LedgerInterventionEvent['baseline'];
  postIntervention: {
    targetRecallRate: number | null;
    targetMisconceptionRate: number | null;
    meanStabilityDays: number;
    controlRecallRate: number | null;
  };
  deltas: {
    recallDelta: number | null;
    misconceptionDelta: number | null;
    stabilityDeltaDays: number;
    controlRecallDelta: number | null;
    netUpliftVsControl: number | null;
  };
  verdict: InterventionVerdict;
  limitations: string;
}

export function computeConceptDynamics(
  ledger: LearningLedger,
  at?: TimestampInput
): Record<string, ConceptDynamics>;

export function diagnoseLearner(
  ledger: LearningLedger,
  at?: TimestampInput
): LearnerDiagnosisReport;

export function recordIntervention(
  ledger: LearningLedger,
  proposal: InterventionProposal,
  at?: TimestampInput
): { ledger: LearningLedger; intervention: LedgerInterventionEvent };

export function evaluateIntervention(
  ledger: LearningLedger,
  interventionId: string,
  at?: TimestampInput,
  options?: { minFollowUpReviews?: number }
): InterventionEvaluation;

export function evaluateAllInterventions(
  ledger: LearningLedger,
  at?: TimestampInput,
  options?: { minFollowUpReviews?: number }
): InterventionEvaluation[];
