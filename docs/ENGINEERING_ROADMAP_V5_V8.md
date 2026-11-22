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
| F | V6.0 Interactive Studio | Real end-to-end scenario, mobile accessibility and privacy QA | Not started |
| G | V6.1 Performance | Repeatable 1k/10k/100k-event benchmarks with environment metadata | Not started |
| H | V7.0 Modular learning infrastructure | Working external content adapter without private curriculum | Not started |
| I | V7.1 Research validation | Predeclared metrics, synthetic/real-data separation, leakage checks | Not started |
| J | V8.0 Community sustainability | Maintainer policy, public backlog, versioning and release checklist | Not started |

### Gate A — Integrity

- Validate schema shape and identifier uniqueness on imported ledger entries.
- Test issuance-to-answer time ordering and baseline/teaching linkage.
- Reject duplicate/replayed evidence without changing existing valid history.
- Run property-style deterministic test generators without external dependencies.
- Document trust boundary: caller-provided imported history is not cryptographically authenticated.

### Gate B — API compatibility

- Run package export tests and compile TypeScript consumer fixtures with a freely available compiler.
- PR #37 proposes dynamic public-subpath runtime/declaration-name checks for every package export. This is **not** a TypeScript compiler proof; independent TS consumer compilation remains pending.
- Compare runtime exports against declaration exports; test Node 20 and 22.
- Make a version compatibility table. Avoid publishing V5 tags until SemVer is resolved.

### Gate C — Contributors

- Document a verified five-minute path from clone to tests and demos.
- Maintain English/Turkish instructions, issue templates, security policy, architecture decisions.
- Add one minimal original external-consumer example; verify instructions in CI.
- PR #36 proposes an original zero-dependency public-package self-import example and subprocess smoke test on Node 20/22. This checks the exported API shape, but an independently installed third-party package consumer still needs separate verification.

### Gate D — MCP

- PR #33 adds basic JSON-RPC argument-shape checks and a complete-line 1 MiB rejection guard. Acceptance remains pending passing Node 20/22 CI and real-client integration evidence.
- V5.1.1 replaces `readline` with a bounded retained-line reader: oversized lines are drained before JSON parsing, and later requests are processed. It bounds retained line fragments, **not** upstream input chunks, decoded JSON objects, tool outputs or total process memory. Node 20/22 CI and real-client integration proof remain acceptance requirements.

- PR #34 includes an independent Node CLI subprocess test for initialize, discovery, synthetic tool calls, invalid calls and post-error recovery. It is a local-protocol client harness, **not** proof of successful integration with Claude Desktop or any specific external MCP client. On-device client testing remains pending.
- Protocol-level integration for initialize, tool discovery, valid and invalid calls.
- Negative tests for malformed JSON-RPC, oversized payloads, unsafe paths and unexpected writes.
- Record client and runtime versions in the evidence report.

### Gate E — Learning quality

- Compare scheduling strategies on the same deterministic event sequences.
- Test empty, sparse and long-gap histories; measure calibration with explicitly described limitations.
- Never infer causal teaching effectiveness or durable mastery from two answers.

### Gate F — Browser Studio

- Demonstrate baseline assessment → editorial remediation → issued reassessment → observed comparison.
- Verify keyboard, screen reader semantics, responsive layouts and storage disclosure.
- Keep visuals faithful to actual API states and errors.

### Gate G — Scale

- Benchmark 1k, 10k, 100k events with fixed seeds and measured runtime/memory.
- State hardware, Node version, run count and variance. Do not invent results.
- Establish budgets only after a baseline exists.

### Gate H — Modular integrations

- Document versioned schemas for external content and learning records.
- Provide an original synthetic content adapter and runnable example.
- Reuse existing Knowledge Core modules; avoid duplicate architecture.

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
