# FARK Study Engine — Engineering roadmap (V5–V8)

> **Status:** planning document, not a release announcement. Package version remains `0.7.0`. The V4–V8 labels describe workstreams, not published SemVer versions. No learning-effectiveness claims are implied.

## Non-negotiable constraints

- MIT-licensed, offline-first, zero mandatory paid services.
- Never publish private KPSS curricula, licensed exam questions, student records or credentials.
- Preserve stable public APIs; breaking changes require a separate migration proposal.
- Synthetic data, observational evidence and validated learning outcomes must be distinguished.
- Every completed task needs reproducible evidence, not just a merged PR.

## Delivery gates

| Gate | Workstream | Acceptance evidence | State |
| --- | --- | --- | --- |
| A | V4.5 Ledger and evidence integrity | Invalid, duplicate, stale, replayed and reordered evidence regression tests; nonmutation; bounded import | In progress |
| B | V4.6 API and TypeScript contracts | Export/import smoke tests, TS compile fixture, Node 20/22 CI, compatibility matrix | In progress |
| C | V5.0 Contributor experience | Quick start, bilingual API docs, issue templates, security policy, ADRs | In progress |
| D | V5.1 MCP hardening | Protocol errors, schema validation, size limits, client integration proof | In progress |
| E | V5.2 Learning quality | Deterministic comparisons, calibration tests, explicit epistemic limits | In progress |
| F | V6.0 Interactive Studio | Real end-to-end scenario, mobile accessibility and privacy QA | In progress |
| G | V6.1 Performance | Repeatable 1k/10k/100k-event benchmarks with environment metadata | In progress |
| H | V7.0 Modular learning infrastructure | Working external content adapter without private curriculum | In progress |
| I | V7.1 Research validation | Predeclared metrics, synthetic/real-data separation, leakage checks | Not started |
| J | V8.0 Community sustainability | Maintainer policy, public backlog, versioning and release checklist | Not started |

### Gate A — Integrity

- Validate schema shape and identifier uniqueness on imported ledger entries.
- Test issuance-to-answer time ordering and baseline/teaching linkage.
- Reject duplicate/replayed evidence without changing existing valid history.
- Run property-style deterministic test generators without external dependencies.
- Document trust boundary: caller-provided imported history is not cryptographically authenticated.
- **Local evidence added:** `test/property-integrity.test.js` runs fixed-seed zero-dependency property tests across 500 DSR updates, ledger non-mutation on cycle rejection, content-readiness audits on all bundled bilingual presets, and reassessment/session tamper-replay guards.

### Gate B — API compatibility

- Run package export tests and compile TypeScript consumer fixtures with a freely available compiler.
- Compare runtime exports against declaration exports; test Node 20 and 22.
- Make a version compatibility table. Avoid publishing V5 tags until SemVer is resolved.

### Gate C — Contributors

- Document a verified five-minute path from clone to tests and demos.
- Maintain English/Turkish instructions, issue templates, security policy, architecture decisions.
- Add one minimal original external-consumer example; verify instructions in CI.

### Gate D — MCP

- PR #33 adds basic JSON-RPC argument-shape checks and a complete-line 1 MiB rejection guard.
- **Streaming cap upgrade:** `startMcpServer` in `src/mcp.js` now uses a byte-bounded streaming `Buffer` chunk reader (`MAX_MCP_MESSAGE_BYTES = 1 MiB`) that enters immediate discard mode once an incoming frame exceeds 1 MiB and recovers cleanly on CRLF/LF boundaries (`test/mcp.test.js` covers multi-chunk 3 MiB streaming rejection + valid follow-up). Acceptance remains pending Node 20/22 CI and external MCP client logs.
- Protocol-level integration for initialize, tool discovery, valid and invalid calls.
- Negative tests for malformed JSON-RPC, oversized payloads, unsafe paths and unexpected writes.
- Record client and runtime versions in the evidence report.

### Gate E — Learning quality

- Compare scheduling strategies on the same deterministic event sequences.
- Test empty, sparse and long-gap histories; measure calibration with explicitly described limitations.
- Never infer causal teaching effectiveness or durable mastery from two answers.
- **Local evidence added:** `src/metacognition.js` (and `types/metacognition.d.ts`, `test/metacognition.test.js`) implements 3-level metacognitive confidence classification (`hypercorrection-alert`, `lucky-guess`, `calibrated-high`, `acknowledged-gap`), ECE/Brier/bias calibration analysis with explicit epistemic-limit notices (non-psychometric, small-sample caveats), and `forecastForgettingHorizon` 14-day forgetting-risk projection with what-if daily study simulation. Both are wired into the Interactive Studio's Guided Closed Loop and Learning Intelligence SVG labs.

### Gate F — Browser Studio

- Demonstrate baseline assessment → editorial remediation → issued reassessment → observed comparison.
- Verify keyboard, screen reader semantics, responsive layouts and storage disclosure.
- Keep visuals faithful to actual API states and errors.
- **Local evidence added:** Interactive Studio (`examples/web/`) now integrates the Guided Closed-Loop Student Flow (with 3-level confidence check and Hypercorrection / Lucky-Guess callouts), Lesson & Curriculum Designer (`auditLearningContent` + live Markdown/CSV Open Content Adapter), interactive SVG prerequisite concept map + live DSR forgetting curve + Metacognitive Calibration Diagram + 14-day Forgetting Horizon what-if simulator, optional Light/Dark reading mode, and 3 original bilingual (EN/TR) Knowledge Cores (`test/closed-loop-studio.test.js`). Real-device mobile/browser QA remains an explicit follow-up outside headless tests.

### Gate G — Scale

- Benchmark 1k, 10k, 100k events with fixed seeds and measured runtime/memory.
- State hardware, Node version, run count and variance. Do not invent results.
- Establish budgets only after a baseline exists.
- **Local evidence added:** `scripts/benchmark-scale.mjs` (seed `202607`, Node `v22.23.2`, Linux x64) measured:
  - `replayReviewStream` (balanced/SM-2/DSR): 1k (`67.69 ms`), 10k (`212.15 ms`), 50k (`1,107.93 ms`), and 100k chunked 2×50k (`2,049.12 ms`, `scoredPredictions: 99,500`, `MAX_EVENTS=50000` guard verified); raw `updateDsrMemory` 100k updates ran in `345.47 ms`.
  - Structural sharing + frozen immutable ledger events + copy-on-write `TRUSTED_LEDGER_META` WeakMap (`src/ledger.js`) reduced 1,000 sequential `recordLedgerReview` appends from `5,443.56 ms` (`O(N^2)`) to `65.23 ms` (~83× speedup).
  - Atomic `recordLedgerReviewsBatch` ran in `37.17 ms` (1k), `66.08 ms` (10k), and `382.20 ms` (50k ceiling) while preserving full immutability and rollback-on-error semantics (`test/ledger-batch-sharing.test.js`).
  - Indexed `computeConceptDynamics` and `projectCardsFromLedger` cut 10k-event `diagnoseLearner` runtime from `4,809.39 ms` to `104.28 ms`.

### Gate H — Modular integrations

- Document versioned schemas for external content and learning records.
- Provide an original synthetic content adapter and runnable example.
- Reuse existing Knowledge Core modules; avoid duplicate architecture.
- **Local evidence added:** `src/core-adapter.js` (and `types/core-adapter.d.ts`, `test/core-adapter.test.js`) converts plain Markdown (`# Course` / `## Outcome` / `### Question`, bilingual EN/TR headings, prerequisite resolution, `[misconception:...]` tags) and RFC-4180 CSV into validated `fark-knowledge-core` v1 packages via `validateKnowledgeCore` and `auditLearningContent` (zero external dependencies, cycle-checked, original bilingual templates). Integrated directly into the Studio Lesson Designer for one-click conversion, readiness auditing, and immediate closed-loop study.

### Gate I — Research rigor

- Publish a reproducible experiment protocol and limitations.
- Separate synthetic demonstrations from consented real-world evidence.
- No real student-data collection without explicit authorization and privacy review.

### Gate J — Sustainability

- Keep a prioritized, issue-linked backlog and contribution pathways.
- Define maintainer response expectations, supported versions and release checklist.
- No invented stars, download counts, collaborators or adoption claims.

## Workflow

1. Begin each gate with a read-only audit and documented gap list.
2. Make small branches and PRs with tests and explicit compatibility notes.
3. Require green CI and review the diff before merging.
4. Update this file from **Not started** → **In progress** → **Verified** only when acceptance evidence exists.
5. Do not create releases, paid dependencies, private-data uploads or claims of learning efficacy automatically.

## Claude for Open Source application evidence

Prepare a separate Turkish and English application draft with links to real source code, CI, demos and contribution guidance. Check the current official eligibility criteria before applying. **Do not submit an application without explicit approval.**
