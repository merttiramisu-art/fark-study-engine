# Explainable study-session planning

The planner is an **optional, deterministic heuristic** for building a bounded review session. It is not an AI tutor, independently graded recommendation, scientifically validated adaptive algorithm, or evidence of improved exam results.

## Usage

```js
import { createCard, reviewCard } from '../src/index.js';
import { planStudySession } from '../src/planner.js';

const now = '2026-11-13T12:00:00Z';
const make = (id, topic) => createCard({
  id, topic, question: `Practice question ${id}?`, answer: 'Sample answer'
});
const wrong = reviewCard(make('math-01', 'Mathematics'), 'again', '2026-11-12T12:00:00Z');
const fresh = make('reading-01', 'Reading');

const plan = planStudySession([wrong, fresh], now, {
  limit: 10,
  maxPerTopic: 5,
  maxNewCards: 3
});
console.log(plan.planned);
```

Package import: `fark-study-engine/planner`. Full runnable example: [examples/session-planning.js](../examples/session-planning.js).

## Selection algorithm

1. **Only due cards.** New cards and reviewed cards whose due time is at or before the supplied timestamp are eligible. Future cards are excluded.
2. **Preserve priority within topics.** The existing mistake-first queue sorts by more `again` responses, older due timestamps, and stable card IDs.
3. **Alternate topics.** Each topic gets one card per round (round-robin), starting with the topic whose highest-priority card ranks first. A large, difficult topic cannot fill the entire session before the other topics are considered.
4. **Enforce limits.** Defaults: `limit: 20`, `maxPerTopic: 5`, `maxNewCards: 4`. All three are configurable nonnegative safe integers.
5. **Explain each selection.** Each item has `id`, `topic`, `status`, `dueAt`, `previousMistakes`, and `reasonCodes`. Supported factual codes are `new-card`, `scheduled-review`, `overdue`, and `previous-mistakes`.
6. **Report deferrals.** `dueCount` contains all eligible cards, `plannedCount` the selected cards, `deferredCount` the difference, `newCardsPlanned` the new-card count, and `perTopic` the number selected from each topic.

## Important boundaries

- Reason codes summarize recorded facts. They **do not diagnose** a student's difficulty or infer mastery.
- The planner never grades, reschedules, mutates, saves, uploads, or automatically completes cards.
- Limits can defer important work. Apps should show `deferredCount`, not pretend all due cards were completed.
- Bad dates, corrupt counters, duplicate IDs and invalid options throw errors. Zero limits return an empty session rather than looping.
- Planned items expose only card metadata, not question text or student identifiers other than the local card ID.
- The algorithm has not been evaluated for real-world learning outcomes; balanced topics do not necessarily improve every learner's performance.

## Türkçe özet

Planlayıcı yalnızca tekrar zamanı gelen kartları alır, konular arasında dönüşümlü dağıtır, **neden seçildiğini** anlaşılır kodlarla gösterir ve ertelenen kart sayısını gizlemez. Varsayılan oturum üst sınırı 20, konu başına 5 ve yeni kart üst sınırı 4'tür. Bu bir öğrenme başarısı tahmini ya da yapay zekâ teşhisi değildir.
