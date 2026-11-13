# Changelog

All notable changes to **FARK Study Engine** are documented in this file.

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
