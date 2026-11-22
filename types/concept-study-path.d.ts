import type { KnowledgeCore } from './knowledge-core.js';
import type { AssessmentHistory } from './assessment.js';
import type { TeachingHistory } from './learning-progress.js';

export interface ConceptStudyPath {
  format:'fark-concept-study-path';
  version:1;
  outcomeId:string;
  outcomeLabel:string;
  prerequisites:Array<{
    outcomeId:string; label:string; status:string; observedAttempts:number;
    mastery:null;
  }>;
  latestAttemptId:string|null;
  latestCorrect:boolean|null;
  mastery:null;
  ignoredFutureAttemptIds:string[];
  disclaimer:string;
  status:string;
  nextAction:string;
  questionId:string|null;
  resourceId:string|null;
  baselineAttemptId?:string;
  orchestrationStatus?:string;
  reason:string;
}
/** Explain one selected outcome using real editorial links and observations. */
export declare function getConceptStudyPath(
  core: KnowledgeCore,
  assessments: AssessmentHistory,
  teaching: TeachingHistory,
  options: { outcomeId:string; at:string }
):ConceptStudyPath;
