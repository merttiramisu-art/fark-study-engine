# Why FARK Exists: Open-Source Learning Infrastructure Architecture (v0.6.0)

> **Thesis:** Spaced-repetition apps do not fail learners because the world ran out of SM-2 clones. They fail because almost every flashcards tool throws away temporal chronology, conflates attention slips with conceptual misconceptions, ignores prerequisite dependencies, and lets AI "tutors" dispense advice with zero empirical audit of whether that advice actually improved retention.

**FARK Study Engine v0.6.0** establishes an open-source, offline-first, **zero-cost & zero-dependency** learning infrastructure built around four inspectable layers: an append-only event ledger, a transparent DSR memory & calibration model, a prerequisite-aware closed-loop intervention engine, and a local Model Context Protocol (MCP) agent bridge.

---

## 1. Critique of Traditional Flashcard Clones

When designing v0.6.0, we audited the limitations of classic Leitner/SM-2 state machines (including FARK v0.1–v0.5's own card snapshots):

1. **Lossy counter collapse:** Mutable `reviews` and `lapses` totals erase *when* reviews happened, *how long* the elapsed interval actually was, and whether errors happened months ago or yesterday.
2. **"Ease Hell":** Fixed SM-2 ease penalties permanently trap recovering concepts in short repetition loops—especially when early errors were casual attention slips rather than conceptual gaps.
3. **Blind independence:** Flat decks assume every card is isolated. Drilling `Algorithms` or `Genetics` cards harder does not repair a broken prerequisite foundation in `Data Structures` or `Cell Biology`.
4. **Open-loop AI tutoring:** Connecting an LLM to a summary screen lets the model invent confident-sounding advice with zero baseline sealing and zero post-intervention uplift measurement.

---

## 2. Four Architectural Layers (`v0.6.0`)

### Layer 1: Append-Only Event-Sourced Learning Ledger (`./ledger`)
- **Format:** `fark-study-ledger` (version `1`), serializable via `exportLedger` / `importLedger` and strictly checked by `validateLedger`.
- **Immutable history:** Every study event records `elapsedDays`, pre-review `predictedR`, rating (`again|hard|good|easy`), optional self-reported `reason`, scheduled `intervalDays`, and updated DSR state.
- **No fabricated timestamps:** When importing legacy `StudyCard[]` snapshots via `createLedger`, FARK preserves prior counters inside `importedSnapshot` without inventing fake historical timestamps.
- **Backward compatibility:** `projectCardsFromLedger` projects standard `StudyCard[]` decks at any timestamp so v0.1–v0.5 planners, CSV/TSV/Markdown exporters, and Web Components keep working unchanged.

### Layer 2: Transparent DSR Memory & Empirical Calibration (`./memory`, `dsr` strategy)
- **Power-law forgetting curve (`computeRetrievability`):**
  $$R(t) = \left(1 + \frac{t}{9S}\right)^{-1}$$
  At $t = S$, predicted recall equals $0.90$ (`DSR_DEFAULTS.defaultTargetRetention`). Optimal interval planning (`computeOptimalIntervalDays`) solves inversely for $R(t) = \text{targetRetention}$.
- **Spacing effect & mean-reverting difficulty (`updateDsrMemory`):** Delayed successful recalls ($R < 0.90$) earn stronger stability multipliers; difficulty mean-reverts rather than locking cards into Ease Hell.
- **Slip vs misconception differentiation:** An `again` labeled `attention` avoids punitive difficulty escalation and sharp stability collapse compared to conceptual `misconception` lapses.
- **Honest prediction scoring (`evaluatePredictionCalibration`):** Scores every prediction where `predictedR != null` using **Brier score**, **log loss**, and 5 probability calibration bins (`0-20%` through `80-100%`), excluding unpredicted first reviews cleanly under `unscoredCount`.

### Layer 3: Prerequisite Concept DAG & Closed-Loop Interventions (`./diagnosis`)
- **Acyclic concept graph (`linkConceptPrerequisites`):** Models dependencies (for example `Mathematics -> Science`, `Cell Biology -> Genetics`) and rejects cycles statically.
- **Recovery vs legacy lapses (`computeConceptDynamics`):** Splits events into `recentSlice` vs `priorSlice` windows to report `improving`, `worsening`, `steady`, or `insufficient-data`.
- **Evidence-ranked recommendations (`diagnoseLearner`):** Surfaces numeric priority signals:
  1. `fix-prerequisite` (priority `100`): flags broken foundation concepts before wasting effort on child cards.
  2. `resolve-misconception` (`85`): detects concentrated conceptual mix-ups.
  3. `rescue-fading-memory` (`70`): surfaces multiple items decaying below 75% predicted `R`.
  4. `slow-down-reading` (`55`): distinguishes attention slips so intervals stay calm.
  5. `consolidate-backlog` (`40`): caps new card intake when due ratios exceed 60%.
- **Closed-loop intervention evaluation (`recordIntervention`, `evaluateIntervention`, `evaluateAllInterventions`):** Seals an action and hypothesis alongside frozen `baseline` target metrics *and* non-target-topic `controlRecallRate`, then computes post-intervention `recallDelta`, `misconceptionDelta`, `stabilityDeltaDays`, `netUpliftVsControl`, and observational verdicts (`insufficient-data`, `positive-signal`, `no-improvement-reassess`, `mixed-or-neutral`).

### Layer 4: Closed-Loop AI Agent Bridge via MCP (`./mcp`, `fark mcp`)
With **11 deterministic tools** over zero-dependency JSON-RPC 2.0 stdio, AI hosts (such as Claude Desktop or Claude Code) move from passive Q&A bots to auditable educational collaborators:

1. Call `fark_diagnose_learner` on a `fark-study-ledger` JSON payload to read prerequisite bottlenecks, DSR trends, and calibration metrics.
2. Guide targeted practice and record outcomes via `fark_log_review_event`.
3. Commit a hypothesis to the ledger via `fark_record_intervention`.
4. After follow-up reviews accumulate, call `fark_evaluate_interventions` to verify whether recall, misconceptions, and stability actually improved relative to the frozen baseline and control topics.

---

## 3. Empirical Validation (`scripts/benchmark-learning.mjs`)

Run `node scripts/benchmark-learning.mjs` locally at zero cost to inspect both synthetic forgetting cohorts (360-day horizon comparisons) and closed-loop intervention discrimination:

| Learner Profile | Strategy | Total Reviews | End Mean `R` | Reviews / 1% `R` | DSR Brier |
| --- | --- | --- | --- | --- | --- |
| Slip-prone (22% attention slips) | `balanced` | 422 | 98.3% | 4.29 | — |
| Slip-prone (22% attention slips) | `sm2` | 419 | 99.1% | 4.23 | — |
| Slip-prone (22% attention slips) | `dsr` | 261 | 96.3% | 2.71 | 0.191 |
| Steady (5% slips) | `balanced` | 286 | 98.4% | 2.91 | — |
| Steady (5% slips) | `sm2` | 258 | 98.1% | 2.63 | — |
| Steady (5% slips) | `dsr` | 200 | 95.6% | 2.09 | 0.0768 |
| Fragile memory (low initial `S`) | `balanced` | 402 | 98.1% | 4.1 | — |
| Fragile memory (low initial `S`) | `sm2` | 367 | 97.1% | 3.78 | — |
| Fragile memory (low initial `S`) | `dsr` | 261 | 92.4% | 2.82 | 0.1484 |

- **Closed-loop discrimination check (30 synthetic trials):** `truePositives=30/30, falsePositives=0/30`.

---

## 4. Scientific Honesty & Explicit Limitations

- **Simulation assumptions:** Cohort benchmarks test synthetic power-law learners under explicit noise models; they verify internal consistency and scheduler trade-offs rather than guaranteeing human exam scores.
- **Observational quasi-control:** `evaluateIntervention` computes within-learner pre/post changes alongside non-target-topic comparisons. Small samples and shared fatigue mean its verdicts are diagnostic signals—never randomized clinical trials.
- **Self-reported recall:** Like every flashcard tool without external grading, memory ratings rely on honest learner input.

---

## Türkçe Özet

**FARK v0.6.0**, sıradan bir "tekrar uygulaması" olmaktan çıkıp açık kaynaklı bir **Öğrenme Defteri (Append-Only Ledger), Bilişsel Tanı ve Kapalı Döngü Müdahale Altyapısı** sunar:

1. **`./ledger` (Eklemeli Öğrenme Defteri):** Hataların ne zaman yapıldığını ve gerçek geçen aralıkları (`elapsedDays`, `predictedR`) silmez; eski desteleri sahte zaman damgası üretmeden okur.
2. **`./memory` & `dsr` stratejisi:** FSRS tarzı güç yasası $R(t) = (1 + t/(9S))^{-1}$ kullanır; dikkatsizlik (`attention`) hatalarını kavram karışıklığından (`misconception`) ayırarak SM-2 "kolaylık cehennemi" tuzağından kaçınır ve **Brier skoru** ile kendi tahmin kalibrasyonunu ölçer.
3. **`./diagnosis` (Önkoşul Grafiği & Kapalı Döngü Müdahale):** Kavram önkoşullarındaki tıkanmaları yakalar; bir öneri mühürlendiğinde (`recordIntervention`) hedef ve kontrol konularının başlangıç değerlerini dondurur ve sonrasında (`evaluateIntervention`) gerçekten işe yarayıp yaramadığını ölçer.
4. **`./mcp` (11 Araçlı Yapay Zekâ Köprüsü):** Claude gibi MCP istemcileri `fark_diagnose_learner`, `fark_log_review_event`, `fark_record_intervention` ve `fark_evaluate_interventions` araçlarıyla uydurma değil, doğrulanabilir pedagojik döngü kurar.
