# V3.3 — Explainable prerequisite and distractor evidence

**Public, zero-dependency engine only.** Private KPSS curriculum, source texts and answer banks remain outside this repository.

## V3.3.1 Prerequisite traversal

`analyzeLearningGaps(core, assessmentHistory, {at, minDistinctQuestions:2})` traverses **direct and transitive outcome prerequisite IDs**. It reports graph distance, observed answers and incorrect answers for each prerequisite. An untested prerequisite is **unknown**, not deficient. The core validator now rejects cyclic unit graphs as well as cyclic outcome graphs.

## V3.3.2 Repeated distractor patterns

For each outcome, incorrect selections tagged by the editorial `misconceptionId` are grouped. Counts include selections and **distinct question IDs**. Repeating the same question cannot qualify as evidence across distinct items. If a question's distractor metadata changes without updating its revision, the attempt is excluded as stale by this analyzer.

## V3.3.3 Explainable ranking

Hypotheses are **candidate checks**, not established causes. Each carries explicit reason codes, observation counts and an ordinal evidence label:

- `repeated-observation`: observed wrong answers on at least two different question IDs (configurable threshold >=2).
- `single-or-repeated-item`: observed wrong answers but insufficient distinct question IDs.
- `unobserved`: no wrong-answer observation on the prerequisite.

Ordering: repeated evidence, number of distinct questions, observed wrong answers, shorter prerequisite distance, then deterministic ID. This ordering is **not** statistical confidence, clinical diagnosis, item calibration or causal attribution. Correct answers and possible confounds remain visible in counts.

## V3.3.4 V3.4 integration

Call `planPersonalStudy(core, assessments, teaching, {at, includePrerequisites:true})` to add `suggestedPrerequisites`, `observedPatterns`, `explanation` and transparent reason codes. Default behavior remains backward-compatible. The planner only suggests prerequisite work **when there are observed incorrect prerequisite answers**; it never fabricates a missing foundation from the graph alone. Suggested prerequisite IDs are annotations, not extra counted daily tasks.

## V3.3.5 Quality gates

Unit tests cover transitive links, unobserved foundations, repeated-item versus distinct-item evidence, ranking, stale/future answers, editorial tag changes, graph cycles and V3.4 integration. GitHub Tests and Mobile Browser QA must pass before merging.

### Example

```js
import {analyzeLearningGaps} from 'fark-study-engine/prerequisite-analysis';
import {planPersonalStudy} from 'fark-study-engine/learning-progress';
const at = new Date().toISOString();
const analysis = analyzeLearningGaps(core, assessments, {at});
const plan = planPersonalStudy(core, assessments, teaching, {at, includePrerequisites:true});
```

No student mastery is inferred. Assessment histories are untrusted inputs unless the hosting app protects their provenance; the current engine is not an anti-cheat or secure exam-scoring server.
