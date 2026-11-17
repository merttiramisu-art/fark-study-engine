import type {KnowledgeCore} from './knowledge-core.js';
import type {AssessmentHistory} from './assessment.js';
export declare function planRemediation(core:KnowledgeCore,history:AssessmentHistory,input:{attemptId:string}):{
 status:string;attemptId:string;questionId?:string;
 recommendations:Array<{outcomeId:string;misconceptionId:string|null;resources:Array<{resourceId:string;resourceRevision:string;kind:string}>}>;rationale?:string
};
export declare function planReassessment(core:KnowledgeCore,history:AssessmentHistory,input:{attemptId:string;outcomeId:string}):{
 status:string;questionId:string|null;questionRevision?:string;outcomeId?:string;baselineAttemptId?:string;rationale?:string
};
export declare function compareReassessment(core:KnowledgeCore,history:AssessmentHistory,input:{baselineAttemptId:string;followupAttemptId:string;outcomeId:string}):{
 status:string;outcomeId:string;mastery:null;baselineAttemptId?:string;followupAttemptId?:string;baselineCorrect?:false;followupCorrect?:boolean;elapsedMs?:number;interpretation?:string;disclaimer?:string
};
