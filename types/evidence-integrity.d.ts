import type {KnowledgeCore} from './knowledge-core.js';
import type {AssessmentHistory} from './assessment.js';
import type {TeachingHistory} from './learning-progress.js';
export interface EvidenceIntegrityRow {usable:boolean;problems:string[]}
export declare function auditLearningEvidence(core:KnowledgeCore,assessments:AssessmentHistory,teaching:TeachingHistory,options:{at:string}):{
 format:'fark-evidence-integrity';version:1;at:string;
 attempts:Array<EvidenceIntegrityRow&{attemptId:string}>;
 completions:Array<EvidenceIntegrityRow&{completionId:string}>;
 summary:{attempts:number;usableAttempts:number;completions:number;usableCompletions:number};
 safeForDescriptiveAnalysis:boolean;disclaimer:string
};
