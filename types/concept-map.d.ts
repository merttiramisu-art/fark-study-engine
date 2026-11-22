import type { KnowledgeCore } from './knowledge-core.js';
import type { AssessmentHistory } from './assessment.js';
export declare const CONCEPT_MAP_LIMITS: Readonly<{maxOutcomes:150;maxPrerequisiteEdges:600}>;
export type ConceptObservationStatus = 'not-observed' | 'correct-observed' |
  'incorrect-observed' | 'mixed-observations';
export interface ConceptMapNode {
  id:string; label:string; unitId:string; unitLabel:string; level:number;
  prerequisiteIds:string[]; dependentIds:string[];
  questionIds:string[]; resourceIds:string[];
  attempts:number; correct:number; incorrect:number;
  status:ConceptObservationStatus;
  misconceptionCounts:Record<string,number>;
  mastery:null;
}
export interface ConceptMapReport {
  format:'fark-concept-map'; version:1;
  nodes:ConceptMapNode[];
  edges:Array<{from:string;to:string;kind:'declared-prerequisite'}>;
  levels:number[];
  excluded:{staleAttemptIds:string[];orphanAttemptIds:string[]};
  mastery:null; disclaimer:string;
}
/** Read-only mapping from explicit outcome prerequisites and current valid answer attempts. */
export declare function buildConceptMap(core:KnowledgeCore,history:AssessmentHistory):ConceptMapReport;
