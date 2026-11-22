import type { KnowledgeCore } from './knowledge-core.js';
import type { AssessmentHistory } from './assessment.js';
import type { TeachingHistory } from './learning-progress.js';

export interface StudyDeskInput {
  core:KnowledgeCore;
  materials:{
    lessons:Array<{id:string;title:string;bodyText:string;visual?:unknown}>;
    questions:Array<{id:string;prompt:string;choices:Array<{id:string;text:string}>}>;
  };
  attribution:{title:string;creator:string;license:string};
}
export interface StudyDeskView {
  format:'fark-study-desk-view';version:1;
  outcome:{id:string;label:string;unitLabel:string;attempts:number;correct:number;
    incorrect:number;status:string;prerequisites:Array<{outcomeId:string;label:string;
      status:string;observedAttempts:number;mastery:null}>};
  lesson:{id:string;title:string;bodyText:string;visual:null|{
    kind:'fraction-comparison'|'number-line'|'timeline';model:unknown}}|null;
  question:{id:string;prompt:string;choices:Array<{id:string;text:string}>}|null;
  path:{status:string;nextAction:string;reason:string;baselineAttemptId:string|null;
    resourceId:string|null;questionId:string|null;mastery:null};
  attribution:{title:string;creator:string;license:string};
  disclaimer:string;mastery:null;
}
/** Strictly read-only original teaching/visual/prompt view of a selected outcome. */
export declare function buildStudyDeskView(
  imported:StudyDeskInput,assessments:AssessmentHistory,teaching:TeachingHistory,
  options:{outcomeId:string;at:string;issuedQuestionId?:string|null}
):StudyDeskView;
