import type {KnowledgeCore} from './knowledge-core.js';
import type {AssessmentHistory} from './assessment.js';
export interface PrerequisiteObservation {outcomeId:string;depth:number;observedAttempts:number;incorrect:number;distinctIncorrectQuestions:number;evidenceLevel:'repeated-observation'|'single-or-repeated-item'|'unobserved';status:string}
export interface MisconceptionPattern {misconceptionId:string;incorrectSelections:number;distinctQuestions:number;attemptIds:string[];evidenceLevel:'repeated-observation'|'single-or-repeated-item';status:string}
export interface LearningHypothesis {type:'prerequisite'|'distractor-pattern';targetOutcomeId?:string;misconceptionId?:string;reasonCodes:string[];evidenceLevel:string;distinctQuestions:number;observations:number;depth?:number}
export declare function analyzeLearningGaps(core:KnowledgeCore,history:AssessmentHistory,options:{at:string|Date;minDistinctQuestions?:number}):{
 outcomes:Array<{outcomeId:string;observedAttempts:number;incorrect:number;distinctIncorrectQuestions:number;prerequisites:PrerequisiteObservation[];misconceptionPatterns:MisconceptionPattern[];hypotheses:LearningHypothesis[];status:string;mastery:null}>;
 excluded:{future:string[];stale:string[];orphan:string[]};parameters:{at:string;minDistinctQuestions:number};disclaimer:string
};
