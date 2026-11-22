/**
 * Example: write an original FARK lesson as a small Markdown document.
 * Run npm run demo:markdown. Offline, no learner history or paid service.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importMarkdownContentPack } from 'fark-study-engine/markdown-content';
import { createAssessmentHistory, recordAssessment } from 'fark-study-engine/assessment';
import { createTeachingHistory } from 'fark-study-engine/learning-progress';
import { getLearningNextStep } from 'fark-study-engine/learning-orchestrator';

const path = fileURLToPath(new URL('./content-packs/original-fractions.md', import.meta.url));
const { core, materials, attribution, disclaimer } = importMarkdownContentPack(readFileSync(path, 'utf8'));
const { history, attempt } = recordAssessment(core, createAssessmentHistory(), {
  attemptId: 'markdown-a1', questionId: 'baseline',
  selectedChoiceId: 'b', at: '2026-01-01T10:00:00.000Z'
});
const next = getLearningNextStep(core, history, createTeachingHistory(), {
  at: '2026-01-01T10:01:00.000Z',
  baselineAttemptId: 'markdown-a1', outcomeId: 'compare-unit-fractions'
});
const linked = materials.lessons.find(lesson => lesson.id === next.resources?.[0]?.resourceId);
process.stdout.write(JSON.stringify({
  sourceFormat: 'FARK Markdown Content Pack v1',
  attribution,
  totalQuestions: core.questions.length,
  firstQuestion: materials.questions[0].prompt,
  observedCorrect: attempt.correct,
  nextStatus: next.status,
  suggestedLesson: linked?.title ?? null,
  mastery: null,
  disclaimer
}, null, 2) + '\n');
