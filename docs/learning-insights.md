# Learning insights in v0.2

The v0.2 functions extend, but do not replace, the original FARK v0.1 review scheduler. The API is deterministic and has no network, storage, or AI dependencies.

## Self-reported mistake categories

```js
import {
  createCard, reviewCard, getTopicSummaries, getMistakeBreakdown
} from '../src/index.js';

const now = '2026-11-13T12:00:00Z';
const first = createCard({
  id: 'math-01', topic: 'Mathematics',
  question: '2 + 3?', answer: '5'
});
const second = reviewCard(first, 'again', now, {
  reason: 'knowledge-gap' // supplied by the user, NOT inferred by FARK
});

console.log(getTopicSummaries([second], now));
console.log(getMistakeBreakdown([second]));
```

Allowed reasons: `knowledge-gap`, `misconception`, `attention`, `other`. A reason is allowed only when rating is `again`. A reason is optional; unspecified remains unspecified and must not be inferred from question text.

## What these statistics actually mean

- `getTopicSummaries(cards, at)` returns an alphabetically sorted list of objects containing `topic` and the original `getStudySummary` fields. An absent review history yields `accuracy: null`.
- `getMistakeBreakdown(cards)` returns `totalLapses` (number of `again` responses), `classified`, `unspecified`, and `byReason` with explicit self-reported categories.
- The existing `accuracy` counts `hard`/`good`/`easy` ratings as successful *reported* reviews; it is **not** externally graded correctness or true knowledge mastery.
- `mature` means reaching scheduling box 4+, not scientifically demonstrated long-term retention.

## Data integrity and compatibility

- Older v0.1 card objects without `reasonCounts` are accepted. They get an empty category history on the next review; previous lapses stay *unspecified*.
- `createCard` now initializes `reasonCounts: {}`; reviewCard returns new objects without mutating earlier versions.
- Card IDs **must be unique within each array/deck**; duplicate IDs in analytic or queue functions throw, rather than counting the same card twice.
- Invalid dates, malformed card fields, impossible cumulative counters, or mistake categories exceeding recorded lapses throw.
- No data is saved automatically: persistence, privacy notice, deletion, user consent, and any migration belong to the integrating application.
- All examples are original and generic; do not commit personal student data or proprietary examination questions.

## Known limitations

The scheduling intervals are simple fixed heuristics. FARK does not diagnose misconception from language, grade written answers, validate learning outcomes, or personalize scientifically optimized intervals. These are research and evaluation opportunities, not existing features.

## Türkçe özet

Bu sürüm konu bazlı tekrar sayılarını ve **öğrencinin kendi seçtiği** hata nedenlerini gösterebilir. Öğrencinin bilgi düzeyini kesin olarak ölçtüğünü ya da hatayı yapay zekâ ile teşhis ettiğini iddia etmez. Önceki sürümün kayıtları bozulmadan okunur; tanımlanmayan hata nedenleri *bilinmiyor* olarak kalır.
