# FARK Study Engine 📚
### The thinking behind learning.

> **If every student learns differently, why should everyone have to study the same way?**

[**Türkçe**](README.tr.md) · **English**

**FARK Study Engine** is an open-source learning utility with a bigger ambition: helping students understand not only **how much** they study, but **what they learn, where they struggle, and when to review**.

It started with a question while exploring a broader exam-preparation platform:

**Does solving more questions necessarily mean learning more?**

We want to explore transparent review scheduling, meaningful mistake analysis, and eventually adaptive study tools that educators, students, and developers can understand, test, and improve together. The idea is not limited to one exam, subject, or country.

**We're just getting started.** The proposed **v0.2.0** expands a small working technical foundation—not a finished AI tutor, scientifically validated personalization model, or complete exam-preparation product.

## What works today

A small **dependency-free, offline-capable JavaScript module**:

- **Study cards:** create cards with an ID, topic, original question, and answer.
- **Review scheduling:** calculate the next review date from `again`, `hard`, `good`, or `easy` responses.
- **Mistake-aware queues:** prioritize due cards with more recorded lapses.
- **Honest progress summaries:** count new, studied, and due cards; report review accuracy only when reviews exist.
- **Topic-level insights (v0.2):** separately summarize reviews, due counts, and self-reported accuracy for each topic without claiming mastery.
- **Self-reported mistake reasons (v0.2):** learners can optionally label an `again` review as `knowledge-gap`, `misconception`, `attention`, or `other`; unclassified mistakes remain explicitly unknown.
- **Data-integrity checks (v0.2):** reject duplicate card IDs, impossible counters, and corrupt reason histories instead of silently inflating progress.
- **Portable decks (v0.2):** opt-in, versioned JSON export and import with validation; no automatic storage, encryption, or cloud backup.
- **Predictable behavior:** return new card objects without modifying the original and produce deterministic results for a given date.

**Important limitations:** Even with the proposed v0.2 insights, the library does **not** save data to disk, synchronize accounts, track students, provide a user interface, or scientifically infer mastery. Review ratings are supplied by the integrating application or learner; they are not independently graded. The current intervals are simple, documented heuristics, not proven optimal learning schedules.

## Quick start

Requires **Node.js 20+**. No API key, subscription, cloud service, or dependency installation required.

```bash
npm test
npm run demo
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

See [the scheduling rules](docs/algorithm.md) for exact intervals and limitations, [v0.2 learning insights](docs/learning-insights.md), and the [portable deck format](docs/portable-decks.md).

## Where we want to go

These are **planned directions**, not completed features.

1. **Evaluate mistake patterns:** study whether optional, self-reported categories lead to better feedback; automatic mistake diagnosis is not implemented.
2. **Explore smarter review schedules:** compare transparent strategies against real, consented learning outcomes instead of claiming one algorithm works for everyone.
3. **Validate progress by topic:** evaluate usefulness and fairness of topic summaries; do not present them as knowledge measurements.
4. **Investigate adaptive study recommendations:** test whether recommendations genuinely help different learners.
5. **Improve accessibility and portability:** data import/export, localization, and simple accessible example interfaces.

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

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Turkish and English contributions are welcome.

## License

[MIT](LICENSE) — free to use, study, modify, and share.
