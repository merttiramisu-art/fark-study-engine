/**
 * Example: original, attributed external content -> existing FARK learning APIs.
 * Run npm run demo:content. Local files only, no user data or external services.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importOpenContentPack } from 'fark-study-engine/content-adapter';
import { createAssessmentHistory, recordAssessment } from 'fark-study-engine/assessment';
import { createTeachingHistory } from 'fark-study-engine/learning-progress';
import { getLearningNextStep } from 'fark-study-engine/learning-orchestrator';

const filename = fileURLToPath(new URL('./content-packs/original-fractions.json', import.meta.url));
const { core, materials, attribution, disclaimer } = importOpenContentPack(readFileSync(filename, 'utf8'));
const answer = recordAssessment(core, createAssessmentHistory(), {
  attemptId: 'demo-answer', questionId: 'baseline',
  selectedChoiceId: 'b', at: '2026-01-01T10:00:00.000Z'
});
const next = getLearningNextStep(core, answer.history, createTeachingHistory(), {
  at: '2026-01-01T10:01:00.000Z',
  baselineAttemptId: 'demo-answer', outcomeId: 'compare-unit-fractions'
});
const lesson = materials.lessons.find(item => item.id === next.resources?.[0]?.resourceId);
console.log(JSON.stringify({
  attribution,
  question: materials.questions[0].prompt,
  observedCorrect: answer.attempt.correct,
  nextStatus: next.status,
  linkedLesson: lesson?.title ?? null,
  mastery: null,
  disclaimer
}, null, 2));
