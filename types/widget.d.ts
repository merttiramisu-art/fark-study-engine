import type { StudyCard, StudySummary, TimestampInput } from './index.js';
import type { PlanOptions, StudyPlan } from './planner.js';
import type { ReviewStrategyId } from './strategies.js';
import type { ClozePromptInfo } from './interchange.js';

export interface WidgetActiveCard extends ClozePromptInfo {
  id: string;
  topic: string;
  rawQuestion: string;
  rawAnswer: string;
}

export interface WidgetSnapshot {
  summary: StudySummary;
  plan: StudyPlan;
  activeCard: WidgetActiveCard | null;
}

export declare class FarkStudyDeckElement {
  connectedCallback(): void;
  setCards(cards: readonly StudyCard[]): void;
  getCards(): StudyCard[];
  setStrategy(strategy?: ReviewStrategyId): void;
}

export function renderWidgetSnapshot(
  cards: readonly StudyCard[],
  at?: TimestampInput,
  options?: PlanOptions
): WidgetSnapshot;

export function registerFarkWidget(tagName?: string): boolean;
