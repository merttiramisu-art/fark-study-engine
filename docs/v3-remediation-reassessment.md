# FARK V3.1–V3.2 — Teaching resources and reassessment

This package adds **deterministic offline orchestration**, not an autonomous tutor. Private curricula and licensed lesson text remain in the private Knowledge Core; public engine exchanges IDs and revisions.

## V3.1 — `planRemediation(core, history, {attemptId})`

Given an **incorrect, version-current** assessment attempt, returns candidate teaching resource IDs for each associated outcome. A resource may optionally declare `misconceptionIds` to target a distractor's editorial misconception tag. Tagged resources are recommended before generic outcome-aligned resources. If no matching resources exist, status is `no-matching-resource`. A stale answer returns `stale-evidence`. No lesson text is generated.

## V3.2 — `planReassessment(core, history, {attemptId, outcomeId})`

Selects a different, previously unanswered question ID for the same outcome, or returns `no-independent-question`. Selection is deterministic by question ID and **does not claim psychometric equivalence**. Content owners must curate alignment, difficulty and parallel-form validity.

After the caller displays teaching material and records a new answer using `recordAssessment`, call `compareReassessment(core, history, {baselineAttemptId, followupAttemptId, outcomeId})`. It requires different question IDs and a strictly later follow-up time, excludes stale revisions, and returns observed correctness and elapsed time with `mastery: null`.

### Safety and integration boundaries

- No automatic assignment of psychological diagnoses from a distractor; tags describe possible misconceptions.
- A later correct answer is not proof of durable learning, nor of a causal benefit from teaching.
- No hidden paid services, network access, or private KPSS questions.
- The caller owns persistence, presentation, student consent, resource completion events, and future spaced review scheduling.
- The engine does **not yet verify that the recommended lesson was read**. V3.3 should introduce auditable intervention completion before calling the workflow a fully closed learning loop.
- The current answer key is local to the supplied core; use a trusted runtime if answer secrecy matters.

### Suggested integration sequence

```js
import { createAssessmentHistory, recordAssessment } from 'fark-study-engine/assessment';
import { planRemediation, planReassessment, compareReassessment } from 'fark-study-engine/learning-loop';

let history = createAssessmentHistory();
history = recordAssessment(core, history, {attemptId:'a1',questionId:'q1',selectedChoiceId:'b',at:'2026-01-01T10:00:00Z'}).history;
const lessonCandidates = planRemediation(core, history, {attemptId:'a1'});
const nextQuestion = planReassessment(core, history, {attemptId:'a1',outcomeId:'outcome-1'});
// The private application displays editorial content and the selected follow-up question.
// Only after an actual answer:
if (nextQuestion.status === 'ready') {
  history = recordAssessment(core, history, {attemptId:'a2',questionId:nextQuestion.questionId,selectedChoiceId:'a',at:'2026-01-02T10:00:00Z'}).history;
  const evidence = compareReassessment(core, history, {baselineAttemptId:'a1',followupAttemptId:'a2',outcomeId:'outcome-1'});
}
```
