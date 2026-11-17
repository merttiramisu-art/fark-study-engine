import type { KnowledgeCore } from './knowledge-core.js';
export interface AssessmentAttempt {id:string;at:string;questionId:string;questionRevision:string;outcomeIds:string[];selectedChoiceId:string;correctChoiceId:string;correct:boolean;misconceptionId?:string}
export interface AssessmentHistory {format:'fark-assessment-history';version:1;attempts:AssessmentAttempt[]}
export declare function createAssessmentHistory():AssessmentHistory;
export declare function validateAssessmentHistory(history:AssessmentHistory):AssessmentHistory;
export declare function recordAssessment(core:KnowledgeCore,history:AssessmentHistory,input:{attemptId:string;questionId:string;selectedChoiceId:string;at:string|Date}):{history:AssessmentHistory;attempt:AssessmentAttempt};
export declare function summarizeAssessments(core:KnowledgeCore,history:AssessmentHistory):{outcomes:Array<{outcomeId:string;attempts:number;correct:number;incorrect:number;misconceptionCounts:Record<string,number>;mastery:null}>;staleAttempts:string[];orphanAttempts:string[];disclaimer:string};
