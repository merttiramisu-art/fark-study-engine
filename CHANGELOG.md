# Changelog

All notable changes to **FARK Study Engine** are documented in this file.

## [0.6.0] - 2026-11-14

### Added
- **Append-only Event-Sourced Learning Ledger (`./ledger`):** `createLedger`, `linkConceptPrerequisites`, `upsertLedgerCard`, `recordLedgerReview`, `projectCardsFromLedger`, `exportLedger`, and `importLedger` implement `fark-study-ledger` v1 without discarding review chronology or fabricating missing historical timestamps.
- **Transparent DSR Memory & Calibration Engine (`./memory`, `dsr` strategy):** `computeRetrievability` ($R(t) = (1 + t/(9S))^{-1}$), `computeOptimalIntervalDays`, mean-reverting `updateDsrMemory` distinguishing `attention` slips from `misconception` lapses, and `evaluatePredictionCalibration` (Brier score, log loss, 5 calibration bins); wired as the 5th scheduling strategy `'dsr'` in `./strategies`.
- **Prerequisite Graph, Diagnosis & Closed-Loop Uplift Evaluation (`./diagnosis`):** acyclic prerequisite DAG checks, `recentSlice` vs `priorSlice` recovery detection (`computeConceptDynamics`), ranked evidence-backed signals (`diagnoseLearner`), and pre/post + non-target-topic control intervention auditing (`recordIntervention`, `evaluateIntervention`, `evaluateAllInterventions`).
- **Closed-loop CLI & 11-tool MCP Server (`./cli`, `./mcp`):** added `fark diagnose <file>`, `'dsr'` strategy support across `fark study` / `fark compare`, and 4 closed-loop MCP tools (`fark_diagnose_learner`, `fark_log_review_event`, `fark_record_intervention`, `fark_evaluate_interventions`).
- **4-Tab Interactive Studio (`examples/web/`):** added **Learning Intelligence** tab (`#tab-intelligence`) displaying calibration metrics, prerequisite/misconception diagnoses with one-click **Seal & Track Intervention +**, closed-loop delta verdicts, concept dynamics, and MCP JSON ledger export/import.
- **Open Learning Infrastructure Manifesto & Benchmark (`docs/open-learning-architecture.md`, `scripts/benchmark-learning.mjs`):** documents the 4-layer architecture, benchmark comparisons across `balanced`/`sm2`/`dsr`, and explicit observational limitations.

## [0.5.0] - 2026-11-14

### Added
- **Transparent `sm2` adaptive strategy (`./strategies`):** deterministic ease-factor scheduling (`1.3–2.8 EF`) computed purely from observable review history and self-reported lapse types, keeping existing `StudyCard` validation untouched.
- **Reason-aware scheduling & recommendations (`./strategies`, `./planner`):** `reasonAware: true` prioritizes conceptual misconceptions (`misconception`, `knowledge-gap`) ahead of minor `attention` slips and exposes `getStudyRecommendations(cards, at)`.
- **Deterministic forgetting-curve benchmark (`simulateCohort`):** seeded `mulberry32` cohort simulations across `steady`, `cramming`, and `missed-days` study profiles comparing `balanced`, `gentle`, `intensive`, and `sm2`.
- **Rich card helpers & Anki/Quizlet TSV interchange (`./interchange`):** `parseClozePrompt` (`{{...}}`, `{{c1::...::hint}}`, `[[...]]`), non-mutating `reverseCardPrompt`, `exportStudyTsv`, `importStudyTsv` (including `#separator:tab` and `#deck:` headers), and curated `SAMPLE_PACKS` / `buildSamplePack` (`starter`, `computer-science`, `biology`, `language`).
- **Zero-dependency Web Component (`./widget` & `examples/widget-demo.html`):** `<fark-study-deck>` shadow-DOM element plus Node-safe `renderWidgetSnapshot` helper.
- **Zero-dependency stdio MCP server (`./mcp` & `fark mcp`):** exposes 7 deterministic study engine tools (`fark_validate_deck`, `fark_get_study_summary`, `fark_plan_session`, `fark_forecast_workload`, `fark_compare_strategies`, `fark_simulate_cohort`, `fark_convert_deck`) over JSON-RPC 2.0 stdio without external SDKs.
- **3-Tab Interactive Studio (`examples/web/`):** compact studio UI with `Study Studio`, `Strategy Simulator`, and `Deck Studio & Packs`, supporting Cloze rendering, Reverse Q↔A toggle, Reason-aware focus, SM-2, 30-day cohort benchmark, sample pack switching, and TSV portability.
- **Open-source governance & full TypeScript `.d.ts` coverage:** added `CHANGELOG.md`, `SECURITY.md`, GitHub issue/PR templates, and `.d.ts` declarations for `./interchange`, `./widget`, and `./mcp`.

## [0.4.0] - 2026-11-13

### Added
- Transparent review strategies (`./strategies`), Markdown study-sheet converter (`./markdown`), interactive terminal CLI (`fark study`, `fark init`, `fark compare`), recall scratchpad, deck explorer, EN/TR web lab toggle, and GitHub Pages deployment.

## [0.3.0] - 2026-11-12

### Added
- Workload forecast (`getReviewForecast`), RFC 4180 CSV converter (`./csv`), zero-dependency CLI (`bin/fark.js`), and TypeScript declarations (`types/*.d.ts`).

## [0.2.0] - 2026-11-11

### Added
- Topic summaries, optional self-reported mistake reasons, data-integrity validation, portable JSON decks, explainable round-robin session planner, and interactive web playground with mobile browser QA.
