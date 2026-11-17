# V4.2 — Knowledge Core ↔ Study Engine content readiness

Before building a student-facing application, use `auditLearningContent` to inspect whether a content package has the minimum inventory for one learning loop.

```js
import {auditLearningContent} from 'fark-study-engine/content-readiness';
const report=auditLearningContent(core,{outcomeIds:['your-outcome-id']});
console.log(report.outcomes[0].problems);
```

The audit checks each outcome for at least two distinct gradable multiple-choice question IDs, at least one linked teaching resource, and assessment coverage for direct prerequisites. It exposes explicit blocker codes rather than silently supplying invented questions or lessons. Results do **not** establish pedagogical quality, historical accuracy, item validity, accessibility, causal efficacy or durable mastery.

## Editorial acceptance process

1. Keep private KPSS history sources and licensed materials in the **private Knowledge Core**, not in this MIT-licensed public repository.
2. Draft one original topic with unit, outcomes, prerequisites, verified academic facts, explanations, two or more independent assessment questions per target outcome, answer keys and teaching resources.
3. Run `validateKnowledgeCore` and `auditLearningContent` locally. Resolve every inventory blocker before testing the learning loop.
4. Run the existing V4 session demo on **synthetic public content**; use the private topic only in an authorized private test environment.
5. Review historical factual accuracy, pedagogy, distractor rationale, accessibility, copyright and student comprehension with qualified humans. Track content revisions and the evidence behind claims.

This package deliberately adds **no application UI**, paid API, student telemetry or private question bank.
