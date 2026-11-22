/**
 * FARK Course Designer V1.2. Editing structure is not evidence of learning.
 * Always run importOpenContentPack from fark-study-engine/content-adapter
 * before using, displaying or exporting the result.
 */
export interface CourseUnit {
  id: string;
  label: string;
  prerequisiteIds?: string[];
}
export interface CourseOutcome {
  id: string;
  unitId: string;
  label: string;
  prerequisiteIds?: string[];
}
export type CourseVisual =
  | {kind: 'fraction-comparison'; left: {numerator: number; denominator: number}; right: {numerator: number; denominator: number}}
  | {kind: 'number-line'; min: number; max: number; points: number[]}
  | {kind: 'timeline'; events: Array<{id: string; year: number; label: string}>};
export interface CourseLesson {
  id: string;
  revision: string;
  title: string;
  outcomeIds: string[];
  bodyText: string;
  misconceptionIds?: string[];
  visual?: CourseVisual;
}
export interface CourseChoice {
  id: string;
  text: string;
  misconceptionId?: string;
}
export interface CourseQuestion {
  id: string;
  revision: string;
  outcomeIds: string[];
  prompt: string;
  correctChoiceId: string;
  choices: CourseChoice[];
}
export interface CourseContentPack {
  format: 'fark-open-content-pack';
  version: 1;
  attribution: {title: string; creator: string; license: string; sourceUrl?: string};
  units: CourseUnit[];
  outcomes: CourseOutcome[];
  lessons: CourseLesson[];
  questions: CourseQuestion[];
  mappings: [];
}
export declare const COURSE_DESIGNER_LIMITS: Readonly<{
  maxBytes: number;
  units: number;
  outcomes: number;
  lessons: number;
  questions: number;
}>;
export declare function buildCourseAuthoringPack(draft: CourseContentPack): CourseContentPack;
export declare function restoreCourseAuthoringDraft(pack: CourseContentPack): CourseContentPack;
export declare function addCourseEntity(draft: CourseContentPack, kind: 'unit'|'outcome'|'lesson'|'question'): {draft: CourseContentPack; selectedId: string};
export declare function removeCourseEntity(draft: CourseContentPack, kind: 'unit'|'outcome'|'lesson'|'question', id: string): CourseContentPack;
export declare function relationshipSummary(draft: CourseContentPack): {units: number; outcomes: number; lessons: number; questions: number; orphanLessons: string[]};
