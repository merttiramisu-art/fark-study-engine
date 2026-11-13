import type { StudyCard } from './index.js';

export declare const PORTABLE_LIMITS: Readonly<{
  maxCards: number;
  maxChars: number;
}>;

export function exportStudyDeck(cards: readonly StudyCard[]): string;

export function importStudyDeck(json: string): StudyCard[];
