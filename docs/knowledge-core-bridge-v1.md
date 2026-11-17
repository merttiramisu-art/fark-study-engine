# FARK Knowledge Core Bridge — v1 (experimental)

The public Study Engine is a reusable **learning evidence and scheduling engine**. A future private exam app can own curriculum, lesson text, questions, distractors, content revisions and rights. This bridge joins **stable identifiers**, not private content. No KPSS material is included.

## Contract

Import `validateKnowledgeCore`, `connectKnowledgeCore`, and `suggestRemediation` from `fark-study-engine/knowledge-core`.

```js
const core = {
  format: 'fark-knowledge-core', version: 1,
  units: [{ id: 'unit-1', label: 'Example unit' }],
  outcomes: [{ id: 'outcome-1', unitId: 'unit-1', label: 'Example objective' }],
  resources: [{ id: 'lesson-1', outcomeIds: ['outcome-1'], kind: 'lesson', revision: '1' }],
  questions: [{ id: 'question-1', outcomeIds: ['outcome-1'], resourceId: 'lesson-1', revision: '1' }],
  mappings: [{ cardId: 'card-1', questionId: 'question-1' }]
};
```

- `connectKnowledgeCore(core, ledger)` attributes self-reported ledger review events to the outcomes tagged on the mapped question.
- Unmapped ledger cards are explicitly reported.
- `suggestRemediation` returns **candidate** teaching resource IDs for outcomes with observed `again` ratings. These are editorial links, not validated causal interventions.
- All operations are read-only. The ledger, card scheduling, and existing data formats remain unchanged.
- `mastery: null` is deliberate. Self-ratings do not prove exam mastery.
- Questions mapped to multiple outcomes contribute the same review event to each outcome; this is **shared evidence**, not independent verification.

## Integration boundaries and next decisions

The private content platform should maintain authoritative source, provenance, version, distractor rationale, misconceptions, prerequisite graph and question-outcome alignment. The public adapter should receive only allowed metadata IDs. In a future version, handle stale mappings when question revisions change, capture actual correctness separately from self-rating, and support confidence/calibration before any mastery estimate.

## Validation

Added Node tests for references, duplicate mappings, cycles, evidence attribution, missing mappings, and remediation suggestions. **No claim of passing tests or browser QA until verified.** This bridge is a foundation, not a finished intelligent tutor.
