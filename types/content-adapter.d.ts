export interface NumberLineLessonVisual {
  kind: 'number-line';
  min: number;
  max: number;
  points: number[];
}
export interface TimelineLessonVisual {
  kind: 'timeline';
  events: Array<{ id: string; year: number; label: string }>;
}
export type LessonVisual = FractionLessonVisual | NumberLineLessonVisual | TimelineLessonVisual;

export interface FractionLessonVisual {
  kind: 'fraction-comparison';
  left: { numerator: number; denominator: number };
  right: { numerator: number; denominator: number };
}
import type { KnowledgeCore } from './knowledge-core.js';

export interface OpenContentPack {
  format: 'fark-open-content-pack';
  version: 1;
  attribution: {
    title: string;
    creator: string;
    license: string;
    sourceUrl?: string;
  };
  units: Array<{ id: string; label: string; prerequisiteIds?: string[] }>;
  outcomes: Array<{ id: string; unitId: string; label: string; prerequisiteIds?: string[] }>;
  lessons: Array<{
    id: string;
    revision: string;
    outcomeIds: string[];
    title: string;
    bodyText: string;
    misconceptionIds?: string[];
    visual?: LessonVisual;
  }>;
  questions: Array<{
    id: string;
    revision: string;
    outcomeIds: string[];
    prompt: string;
    correctChoiceId: string;
    choices: Array<{ id: string; text: string; misconceptionId?: string }>;
  }>;
  mappings?: Array<{ cardId: string; questionId: string }>;
}

export interface ImportedOpenContentPack {
  core: KnowledgeCore;
  materials: {
    lessons: Array<{ id: string; title: string; bodyText: string; visual?: FractionLessonVisual }>;
    questions: Array<{ id: string; prompt: string; choices: Array<{ id: string; text: string }> }>;
  };
  attribution: { title: string; creator: string; license: string; sourceUrl?: string };
  disclaimer: string;
}

export declare const OPEN_CONTENT_PACK_LIMITS: Readonly<{
  maxBytes: number;
  maxUnits: number;
  maxOutcomes: number;
  maxLessons: number;
  maxQuestions: number;
  maxMappings: number;
}>;
export function importOpenContentPack(input: OpenContentPack | string): ImportedOpenContentPack;
