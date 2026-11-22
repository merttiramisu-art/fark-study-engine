export declare const COURSE_PACK_FORMAT: 'fark-course-pack';
export declare const COURSE_PACK_VERSION: 1;

export type CoursePackKind = 'closed-loop' | 'flashcards';
export type CoursePackSource = 'builtin' | 'uploaded' | 'registered';
export type CoursePackAccent = 'cobalt' | 'emerald' | 'amber' | 'indigo' | 'slate';

export interface LocalizedText {
  en: string;
  tr: string;
}

export interface CoursePackInput {
  id?: string;
  kind: CoursePackKind;
  title: string | Partial<LocalizedText>;
  subtitle?: string | Partial<LocalizedText>;
  category?: string | Partial<LocalizedText>;
  accent?: CoursePackAccent;
  icon?: string;
  source?: CoursePackSource;
  estimatedMinutes?: number;
  payload: unknown;
}

export interface CoursePack {
  format: 'fark-course-pack';
  version: 1;
  id: string;
  kind: CoursePackKind;
  title: LocalizedText;
  subtitle: LocalizedText;
  category: LocalizedText;
  accent: CoursePackAccent;
  icon: string;
  source: CoursePackSource;
  estimatedMinutes: number;
  itemCount: number;
  questionCount: number;
  readyCount: number;
  payload: unknown;
}

export interface ParsedCoursePackResult {
  pack: CoursePack;
  readiness: unknown | null;
  warnings: string[];
}

export interface CourseRegistry {
  registerCoursePack(input: CoursePackInput): CoursePack;
  unregisterCoursePack(id: string): boolean;
  getCoursePack(id: string): CoursePack | null;
  listCoursePacks(): CoursePack[];
  exportCoursePackJson(id: string): string;
  subscribe(listener: (packs: CoursePack[]) => void): () => void;
}

export function resolveLocalizedText(value: string | Partial<LocalizedText> | null | undefined, lang?: 'en' | 'tr'): string;
export function validateCoursePack(input: CoursePackInput): CoursePack;
export function serializeCoursePack(pack: CoursePackInput): string;
export function parseCoursePackFile(
  rawText: string,
  options?: { filename?: string; title?: string; id?: string; source?: CoursePackSource }
): ParsedCoursePackResult;
export function createCourseRegistry(initialPacks?: CoursePackInput[]): CourseRegistry;
