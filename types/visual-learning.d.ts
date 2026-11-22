export declare const VISUAL_LEARNING_LIMITS: Readonly<{
  minNumber: -12; maxNumber: 12; maxPoints: 8;
  minYear: -3000; maxYear: 3000; maxEvents: 8;
}>;
export interface NumberLineInput {
  min: number; max: number; points: number[];
}
export interface TimelineEvent {
  id: string; year: number; label: string;
}
export interface TimelineInput {
  events: TimelineEvent[];
}
export interface NumberLineModel {
  kind: 'number-line'; min: number; max: number; points: number[];
  ticks: Array<{ value: number; selected: boolean }>;
  summary: string; mastery: null;
}
export interface TimelineModel {
  kind: 'timeline'; events: TimelineEvent[];
  summary: string; mastery: null;
}
export declare function buildNumberLineModel(input: NumberLineInput): NumberLineModel;
export declare function buildTimelineModel(input: TimelineInput): TimelineModel;
