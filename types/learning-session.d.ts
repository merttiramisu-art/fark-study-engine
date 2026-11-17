import type {KnowledgeCore} from './knowledge-core.js';
import type {AssessmentHistory} from './assessment.js';
import type {TeachingHistory} from './learning-progress.js';
export interface LearningSession {format:'fark-learning-session';version:1;sessionId:string;createdAt:string;baselineAttemptId:string;outcomeId:string;baselineQuestionId:string;baselineQuestionRevision:string;assessments:AssessmentHistory;teaching:TeachingHistory}
export declare function createLearningSession(core:KnowledgeCore,assessments:AssessmentHistory,teaching:TeachingHistory,options:{sessionId:string;baselineAttemptId:string;outcomeId:string;at:string}):LearningSession;
export declare function parseLearningSession(json:string):LearningSession;
export declare function serializeLearningSession(session:LearningSession):string;
export declare function resumeLearningSession(core:KnowledgeCore,session:LearningSession,options:{at:string;assessments?:AssessmentHistory;teaching?:TeachingHistory}):{sessionId:string;at:string;step:{status:string;nextAction:string;mastery:null};assessments:AssessmentHistory;teaching:TeachingHistory;warning:string};
