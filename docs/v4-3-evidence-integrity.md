# V4.3 — Evidence integrity and multi-outcome safeguards

This release hardens the **learning engine**, not the student-facing application.

## Critical regression fixed

A single incorrect assessment can cover multiple outcomes. Previously, a self-reported completion of a lesson for outcome A could unlock reassessment of outcome B when both outcomes appeared on the same baseline attempt. The V4 orchestrator now requires the **completed resource to be aligned to the specifically requested outcome**. A completion for A does not imply teaching for B.

## New cross-history audit

```js
import {auditLearningEvidence} from 'fark-study-engine/evidence-integrity';
const report = auditLearningEvidence(core, assessments, teaching, {
  at: new Date().toISOString()
});
if (!report.safeForDescriptiveAnalysis) {
  console.log(report.attempts, report.completions);
}
```

The read-only audit checks:
- future-dated, orphaned, revised or internally inconsistent assessment records;
- missing, correct, stale or future baselines for teaching completions;
- teaching completion before baseline;
- resource revision mismatch, missing resources, outcome mismatch and editorial misconception mismatch.

Every record receives explicit problem codes and a usability flag. `safeForDescriptiveAnalysis` is false if any record is unusable; it is **not** a guarantee that records are authentic or that learning occurred. Host applications should exclude or quarantine flagged records before student-facing recommendations.

## Acceptance and safety boundaries

- No hidden KPSS content, copyrighted questions, paid APIs or network calls.
- Pure, deterministic, no mutation of source histories.
- Multi-outcome regression tests and stale/future/revision tests.
- A distinct post-teaching answer is not proof it was an **issued** reassessment. A later phase should add a persisted, version-aware issued-question event with replay protection.
- Student identity, encryption, multi-device reconciliation, source credibility and instructional effectiveness require separate validation.
- `mastery` remains unknown; observed correctness and reported completion are not causal evidence.
