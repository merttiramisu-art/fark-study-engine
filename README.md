# FARK Study Engine 📚
### The thinking behind learning.

> **If every student learns differently, why should everyone have to study the same way?**

[**Türkçe**](README.tr.md) · **English**

**FARK Study Engine** is an open-source learning utility with a bigger ambition: helping students understand not only **how much** they study, but **what they learn, where they struggle, and when to review**.

It started with a question while exploring a broader exam-preparation platform:

**Does solving more questions necessarily mean learning more?**

We want to explore transparent review scheduling, meaningful mistake analysis, and eventually adaptive study tools that educators, students, and developers can understand, test, and improve together. The idea is not limited to one exam, subject, or country.

**We're just getting started.** **v0.5.0** expands the open-source foundation with SM-2 adaptive scheduling, a deterministic cohort simulator, Cloze & Anki TSV portability, an embeddable Web Component, and a zero-dependency MCP server—still without claiming to be a finished AI tutor or certified clinical learning model.

> **Live Interactive Studio (browser-only, zero tracking):** [merttiramisu-art.github.io/fark-study-engine](https://merttiramisu-art.github.io/fark-study-engine/)

![FARK Study Engine Interactive Studio](docs/images/interactive-lab.png)

## What works today

A **dependency-free, offline-capable JavaScript module**:

- **Study cards & Cloze prompts:** create cards with ID, topic, question, and answer—or inline `{{cloze}}` / `{{c1::answer::hint}}` / `[[blank]]` deletions (`parseClozePrompt`) and ephemeral bi-directional `reverseCardPrompt` views (`./interchange`).
- **Transparent spacing & SM-2 (`./strategies`):** compare and test documented presets (`balanced`, `gentle`, `intensive`) alongside transparent `sm2` ease-factor scheduling (`1.3–2.8 EF`) derived strictly from observable review history and self-reported lapse categories (`reasonAware: true`), plus seeded 30-day forgetting-curve benchmarks (`simulateCohort`).
- **Reason-aware explainable sessions (`./planner`):** plan bounded round-robin study queues with explicit reason codes, optional `reasonAware: true` prioritization (`concept-misconception`, `knowledge-gap`, `attention-slip`), and honest topic recommendations (`getStudyRecommendations`).
- **Self-reported mistake reasons & honest summaries:** learners can optionally label an `again` review as `knowledge-gap`, `misconception`, `attention`, or `other`; unclassified lapses remain explicitly unknown, duplicate IDs and impossible states are rejected, and unknown accuracy stays `null`.
- **Portable formats (`./portable`, `./csv`, `./markdown`, `./interchange`):** versioned JSON backups, RFC 4180 CSV (with opt-in formula-injection escaping), printable Markdown study sheets + `Q :: A` / `Q:`+`A:` parsing, Anki/Quizlet `.tsv` round-trips (`#separator:tab`, `#deck:Topic`), and 4 curated sample packs (`buildSamplePack`).
- **Upcoming workload forecast (`getReviewForecast`):** count already-scheduled `dueAt` dates over 1–365 days while keeping unreviewed cards explicitly separate.
- **Zero-dependency CLI (`fark`):** `init --pack <id>`, `study --reason-aware --save`, `validate`, `summary`, `plan`, `forecast`, `compare`, `simulate`, `convert`, and `mcp` across JSON, CSV, TSV, and Markdown (`node bin/fark.js --help`).
- **Zero-dependency stdio MCP server (`./mcp`, `fark mcp`):** exposes 7 study tools over JSON-RPC 2.0 stdio so Claude Desktop, Claude Code, or other MCP hosts can validate decks, plan sessions, compare strategies, run simulations, and convert formats using real deterministic code rather than mental math.
- **Embeddable Web Component (`./widget`):** standalone `<fark-study-deck>` Shadow DOM element + Node-safe `renderWidgetSnapshot` helper ([embed demo](examples/widget-demo.html)).
- **TypeScript declarations (`types/*.d.ts`):** typed entrypoints for `.`, `./planner`, `./portable`, `./csv`, `./markdown`, `./strategies`, `./interchange`, `./widget`, and `./mcp`.
- **3-Tab Interactive Studio (`examples/web/`):** `Study Studio` | `Strategy Simulator` | `Deck Studio & Packs` with SM-2 selector, Cloze & `Reverse Q↔A` toggles, honest focus signals, 30-day cohort benchmark, sample pack switching, keyboard shortcuts (`Space`, `1–4`, `S`), JSON/CSV/TSV/Markdown portability, and EN/TR switching with zero cloud, login, tracking, or cookies.
- **Honest skipping & mobile QA:** skip without recording a review, keep skipped cards due, and verify all 3 studio tabs at `360px`, `393px`, and `1280px` in headless Chromium.

**Important limitations:** Even with the proposed v0.2 insights, the library does **not** save data to disk, synchronize accounts, track students, provide a user interface, or scientifically infer mastery. Review ratings are supplied by the integrating application or learner; they are not independently graded. The current intervals are simple, documented heuristics, not proven optimal learning schedules.

## Quick start

Requires **Node.js 20+**. No API key, subscription, cloud service, or dependency installation required.

```bash
npm test
npm run demo
npm run demo:planner
npm run demo:web  # visit http://127.0.0.1:4173/examples/web/
node bin/fark.js --help
node bin/fark.js simulate --profile missed-days
```

### MCP Server integration (Claude Desktop / Claude Code / stdio hosts)

Run FARK as a local zero-dependency stdio MCP server:

```json
{
  "mcpServers": {
    "fark-study-engine": {
      "command": "node",
      "args": ["C:/path/to/fark-study-engine/bin/fark.js", "mcp"]
    }
  }
}
```

```js
import {
  createCard,
  reviewCard,
  selectReviewQueue,
  getStudySummary
} from './src/index.js';

const now = '2026-11-13T12:00:00Z';
const card = createCard({
  id: 'math-01',
  topic: 'Mathematics',
  question: 'What is 2 + 3?',
  answer: '5'
});

const reviewed = reviewCard(card, 'good', now);

console.log(reviewed.dueAt); // 2026-11-14T12:00:00.000Z
console.log(selectReviewQueue([reviewed], '2026-11-14T12:00:00Z'));
console.log(getStudySummary([reviewed], now));
```

See [the scheduling rules](docs/algorithm.md) for exact intervals and limitations, [transparent strategies & Markdown notes](docs/strategies-and-markdown.md), [v0.2 learning insights](docs/learning-insights.md), the [portable deck format](docs/portable-decks.md), [CSV, forecast, CLI & TypeScript notes](docs/csv-and-cli.md), [the explainable session planner](docs/session-planner.md), [the interactive browser lab](docs/interactive-lab.md), and [mobile browser QA notes](docs/mobile-qa.md).

## Where we want to go

These are **planned directions**, not completed features.

1. **Evaluate mistake patterns:** study whether optional, self-reported categories lead to better feedback; automatic mistake diagnosis is not implemented.
2. **Explore smarter review schedules:** compare transparent strategies against real, consented learning outcomes instead of claiming one algorithm works for everyone.
3. **Validate progress by topic:** evaluate usefulness and fairness of topic summaries; do not present them as knowledge measurements.
4. **Investigate adaptive study recommendations:** test whether recommendations genuinely help different learners.
5. **Improve accessibility and usability:** localization, simple accessible example interfaces and evidence-based evaluation of session-planning limits.

We want to document assumptions, test behavior, and distinguish promising educational ideas from evidence-backed results.

## Why open source?

FARK grew out of an exam-learning vision, but learning challenges extend far beyond any one test. A reusable, understandable core can help others experiment without depending on a proprietary service.

Our principles:

- **Honest measurement:** unknown learning outcomes stay unknown.
- **Privacy by design:** no personal student data, secrets, private project files, or telemetry in the repository.
- **Original materials:** no copied exam questions, commercial textbooks, or content published without permission.
- **Transparency:** explain algorithms and their limitations.
- **Careful engineering:** test behavior rather than assuming that code is correct because it runs.

## Contributing

This is an early-stage open-source project, and constructive feedback is welcome. You do not need to be an experienced developer to contribute: reproducing a bug, proposing a test, improving accessibility, or clarifying documentation can all help.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request, see [CHANGELOG.md](CHANGELOG.md) for release notes, and check [SECURITY.md](SECURITY.md) to report vulnerabilities responsibly. Turkish and English contributions are welcome.

## License

[MIT](LICENSE) — free to use, study, modify, and share.
