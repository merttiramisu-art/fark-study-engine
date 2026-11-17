# V3.1 completion, V3.4 personal study plan, V3.5 evidence report

Import from `fark-study-engine/learning-progress`. These APIs operate on the public content **schema**, not private KPSS lesson content, and are deterministic for an explicit `at` timestamp.

- **V3.1:** `createTeachingHistory()` and `recordTeachingCompletion(core, assessments, teaching, {completionId, resourceId, baselineAttemptId, at})` append a caller-reported, revision-snapshotted teaching completion to a new immutable history. Requires an aligned resource and a current incorrect baseline. **Self-reported completion is not proof of learning.**
- **V3.4:** `planPersonalStudy(core, assessments, teaching, {at, limit, maxPerUnit})` recommends outcomes with observed incorrect answers, with deterministic tie-breaks and per-unit/session caps. Returns generic aligned teaching resource IDs and an unused aligned question ID, if any. Does **not** claim a spaced-repetition schedule or mastery estimate. Previously answered question IDs are excluded, including old revisions.
- **V3.5:** `getLearningEvidenceReport(core, assessments, teaching, {at})` reports observed correct/incorrect counts, editorial misconception tags and reported teaching completions by outcome. Stale, orphan and future-dated evidence is separately reported and excluded. `mastery` remains `null`.

The evidence report's totals count **outcome attributions**, not unique question attempts: multi-outcome questions count once per outcome. These are descriptive observations, not causal effectiveness claims or calibrated student ability. Historical content migrations, delayed tests, assessment-equivalence calibration and verified teaching engagement remain future work. Private answer keys should run in a trusted environment when secrecy is required.

All functions are offline and have no network or paid API dependencies.
