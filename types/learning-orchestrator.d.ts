import type {KnowledgeCore} from './knowledge-core.js';
import type {AssessmentHistory} from './assessment.js';
import type {TeachingHistory} from './learning-progress.js';
export declare function getLearningNextStep(core:KnowledgeCore,assessments:AssessmentHistory,teaching:TeachingHistory,options:{at:string|Date;baselineAttemptId:string;outcomeId:string}):{
 status:string;nextAction:'review-evidence'|'present-teaching'|'editorial-review'|'present-reassessment';
 outcomeId:string;baselineAttemptId?:string;resources?:Array<{resourceId:string;resourceRevision:string;kind:string}>;
 completionRequired?:boolean;completionIds?:string[];questionId?:string|null;questionRevision?:string|null;
 followupAttemptId?:string;comparison?:{status:string;followupCorrect?:boolean;mastery:null};mastery:null
};
export declare function getLearningDashboard(core:KnowledgeCore,assessments:AssessmentHistory,teaching:TeachingHistory,options:{at:string|Date;limit?:number;maxPerUnit?:number}):{
 at:string;gaps:object;plan:object;evidence:object;mastery:null;disclaimer:string
};
