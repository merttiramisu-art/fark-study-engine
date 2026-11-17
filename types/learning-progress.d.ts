import type {KnowledgeCore} from './knowledge-core.js';
import type {AssessmentHistory} from './assessment.js';
export interface TeachingCompletion {id:string;resourceId:string;resourceRevision:string;baselineAttemptId:string;at:string}
export interface TeachingHistory {format:'fark-teaching-history';version:1;completions:TeachingCompletion[]}
export declare function createTeachingHistory():TeachingHistory;
export declare function validateTeachingHistory(history:TeachingHistory):TeachingHistory;
export declare function recordTeachingCompletion(core:KnowledgeCore,assessments:AssessmentHistory,teaching:TeachingHistory,input:{completionId:string;resourceId:string;baselineAttemptId:string;at:string|Date}):{history:TeachingHistory;completion:TeachingCompletion};
export interface OutcomeEvidence {outcomeId:string;label:string;attempts:number;correct:number;incorrect:number;latestAt:string|null;misconceptionCounts:Record<string,number>;teachingCompletions:number;mastery:null}
export interface ExcludedEvidence {staleAttempts:string[];futureAttempts:string[];orphanAttempts:string[];staleCompletions:string[];futureCompletions:string[]}
export declare function getLearningEvidenceReport(core:KnowledgeCore,assessments:AssessmentHistory,teaching:TeachingHistory,options:{at:string|Date}):{outcomes:OutcomeEvidence[];excluded:ExcludedEvidence;totals:{attempts:number;correct:number;incorrect:number};disclaimer:string};
export declare function planPersonalStudy(core:KnowledgeCore,assessments:AssessmentHistory,teaching:TeachingHistory,options:{at:string|Date;limit?:number;maxPerUnit?:number}):{planned:Array<{outcomeId:string;unitId:string;observedIncorrect:number;observedAttempts:number;resourceIds:string[];unseenQuestionId:string|null;reasonCodes:string[]}>;plannedCount:number;deferredCount:number;excluded:ExcludedEvidence;disclaimer:string};
