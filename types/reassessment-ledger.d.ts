import type {KnowledgeCore} from './knowledge-core.js';
import type {AssessmentHistory} from './assessment.js';
import type {TeachingHistory} from './learning-progress.js';

export interface ReassessmentIssue {
  id:string;
  baselineAttemptId:string;
  outcomeId:string;
  questionId:string;
  questionRevision:string;
  issuedAt:string;
}
export interface ReassessmentLedger {
  format:'fark-reassessment-ledger';
  version:1;
  issues:ReassessmentIssue[];
}

/** Status values returned when a question is issued or issuance is blocked. */
export type ReassessmentIssuanceStatus =
  'issued' | 'no-unissued-question' |
  'teaching-needed' | 'ready-to-teach' | 'ready-to-reassess' |
  'stale-evidence' | 'no-baseline' | 'no-matching-resource' |
  (string & {});

/** Verification never infers durable mastery. */
export type IssuedReassessmentVerificationStatus =
  'verified-issued-answer' | 'stale-evidence' |
  'unmatched-issued-question' | 'outside-issuance-window' |
  'not-first-issued-response' | 'ambiguous-issuance';

export declare function createReassessmentLedger():ReassessmentLedger;
export declare function validateReassessmentLedger(ledger:ReassessmentLedger):ReassessmentLedger;
export declare function issueReassessment(
  core:KnowledgeCore, assessments:AssessmentHistory, teaching:TeachingHistory,
  ledger:ReassessmentLedger,
  options:{issueId:string;baselineAttemptId:string;outcomeId:string;at:string}
):{status:ReassessmentIssuanceStatus;ledger:ReassessmentLedger;issue:ReassessmentIssue|null};
export declare function verifyIssuedReassessment(
  core:KnowledgeCore, assessments:AssessmentHistory, ledger:ReassessmentLedger,
  options:{issueId:string;followupAttemptId:string;at:string}
):{
  status:IssuedReassessmentVerificationStatus;
  issueId:string;
  followupAttemptId?:string;
  comparison?:{status:string;followupCorrect?:boolean;mastery:null};
  mastery:null;
};
