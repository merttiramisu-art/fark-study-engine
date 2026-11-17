import type {KnowledgeCore} from './knowledge-core.js';
export interface ContentReadinessRow {
 outcomeId:string;ready:boolean;questionCount:number;gradableQuestionCount:number;
 teachingResourceCount:number;resourceKinds:string[];prerequisiteIds:string[];
 missingPrerequisiteEvidence:string[];problems:string[];
}
export declare function auditLearningContent(core:KnowledgeCore,options?:{outcomeIds?:string[]}):{
 format:'fark-content-readiness';version:1;outcomes:ContentReadinessRow[];
 summary:{checked:number;ready:number;blocked:number};disclaimer:string
};
