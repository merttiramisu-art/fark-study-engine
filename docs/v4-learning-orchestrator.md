# FARK V4 — Learning Orchestrator (initial implementation)

V4 connects existing V3 APIs without adding a paid service, private curriculum, network call or an unsupported mastery estimate.

## Single learning path

1. Host app records an incorrect assessment with `recordAssessment`.
2. `getLearningNextStep(core, assessments, teaching, {at, baselineAttemptId, outcomeId})` returns `present-teaching` and matching editorial resource IDs, or `editorial-review` when no material exists.
3. Host app displays the private lesson and **explicitly records user-reported completion** using `recordTeachingCompletion`. Viewing the lesson is not assumed.
4. The orchestrator then returns `present-reassessment` with an unseen, distinct, outcome-aligned question. If none exists it returns `editorial-review`.
5. Host app records the later answer. Orchestrator reports `reassessment-observed` and the existing V3.2 comparison. Earlier attempts cannot count as post-teaching checks.
6. `getLearningDashboard` returns a consistent snapshot of V3.3 prerequisite/distractor analysis, V3.4 study plan and V3.5 evidence report.

Both functions are pure and read-only. The host owns UI, durable storage, authentication, content security, student consent and actual lesson delivery. A lesson completion is **self-reported**, not verified engagement. The comparison is descriptive and does not prove that teaching caused improvement. `mastery` remains `null`.

## Example

```js
import {getLearningNextStep,getLearningDashboard} from 'fark-study-engine/learning-orchestrator';
const at = new Date().toISOString();
const next = getLearningNextStep(core, assessments, teaching, {
  at, baselineAttemptId:'attempt-1', outcomeId:'outcome-1'
});
const dashboard = getLearningDashboard(core, assessments, teaching, {at,limit:5});
```

## Known limitations

- No automatic scheduling, cross-device persistence, real student UX, verified reading telemetry or secure exam delivery.
- A follow-up is matched by outcome, timestamp and distinct question ID, not a cryptographically verified assignment. Production apps should persist a dedicated issued-question event to prevent attributing unrelated attempts.
- The first eligible follow-up is used; later longitudinal evidence remains in the underlying histories.
- Answered question IDs are not reused even if revised, until the content owner designs a calibrated reassessment policy.
- Real KPSS question calibration, multi-outcome fairness and student field trials remain necessary.

Tests cover no-content, stale revisions, future timestamps, lesson gating, chronological reassessment, exhausted question pools and dashboard consistency.
