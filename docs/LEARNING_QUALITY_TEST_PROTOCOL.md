# V5.2 — Learning-quality regression protocol

This document specifies **software verification**, not proof of educational effectiveness. All fixtures are original and synthetic; no private KPSS lessons, identifiable learner data, or licensed questions are used.

## Reproducible scenarios

Run `node --test test/learning-quality-edge.test.js` (also included in `npm test` / Node 20 and 22 CI).

| Scenario | Expected software behavior | What it cannot establish |
| --- | --- | --- |
| Empty history | Zero scored samples, null calibration scores, no fitted model | Learner ability or retention |
| One observation per card | No predictive evidence from first review; no fitted model | Mastery after one answer |
| Long review gap | Finite probabilities and calibration scores inside numerical bounds | That the memory decay curve matches real humans |
| Chronology and format | Equivalent ordered events yield identical replay reports across array/CSV/JSONL | Data provenance or data validity outside format checks |
| Synthetic sequential holdout | Training-only parameter selection; tail evaluated as a chronological holdout | Generalization to real learners or causal intervention effects |

## Interpretation safeguards

- `fitLearnerParameters().improved` reflects fitted-parameter selection **on the available input**. It is not evidence of out-of-sample benefit. Inspect `holdout` separately when present.
- A reported holdout is still based on the **same synthetic observation process**; its value measures a software prediction comparison under test assumptions.
- First observations without a prior memory state are deliberately unscored, rather than assumed perfect recall.
- Brier score and log loss describe agreement between predicted and observed **self-reported review ratings**, not independent learning assessments.
- Privacy rule: no student records or private curricula in tests or PR artifacts.

## Release gate

V5.2 stays **In progress** until baseline comparisons, edge-case regression CI, meaningful limitations, and separately permissioned real-world evidence (if ever pursued) have been reviewed. The package version remains 0.7.0; do not claim validated learning improvement from these tests.
