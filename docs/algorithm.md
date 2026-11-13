# Scheduling rules / Tekrar planlama kuralları

This repository intentionally uses a **transparent demonstration heuristic**, not a validated learning-science model. It is not a clone of a proprietary algorithm.

| Rating | Box change | Next review |
| --- | --- | --- |
| `again` | reset to 0 | 10 minutes |
| `hard` | unchanged | 6 hours |
| `good` | +1 (max 6) | by box: 1, 3, 7, 14, 30, 60 days |
| `easy` | +2 (max 6) | by box: 1, 3, 7, 14, 30, 60 days |

- New cards are due immediately.
- Only due or never-reviewed cards appear in the queue.
- Due queue priority: more `again` ratings first, then older deadlines, then stable ID.
- `mature` is defined here as box 4+ solely for display, not as proven mastery.
- Accuracy is `correctReviews / totalReviews`, where `hard`, `good`, and `easy` count as recalls. It is `null` when the denominator is zero.
- All dates are ISO 8601 UTC; state changes are immutable and deterministic for a given timestamp.
- This API does not implement persistence, backups, synchronization, or personally identifiable student tracking. Integrators must explicitly choose a storage system and validate user inputs.

## Türkçe not

Bu tekrar zamanlaması **deneme amaçlı bir sezgiseldir**; bilimsel olarak doğrulanmış bir kişisel öğrenme modeli olduğu iddia edilmez. Kendi eğitim uygulamanızda kullanmadan önce kullanıcı deneyimi ve öğrenme sonuçlarıyla değerlendirin.

## v0.2: Learning insights, not learning diagnosis

- `getTopicSummaries(cards, at)` groups by card topic and reports basic review statistics. It does not infer what a student truly knows.
- `reviewCard(card, 'again', at, { reason })` records an *optional, self-reported* category: `knowledge-gap`, `misconception`, `attention`, or `other`. It never assigns a diagnosis automatically.
- `getMistakeBreakdown(cards)` reports category totals and an explicit `unspecified` count for unclassified `again` responses. Existing v0.1 cards without `reasonCounts` remain supported.
- The review queue and summaries reject duplicate card IDs, inconsistent counters, invalid dates, and impossible reason histories rather than silently double-counting.
- Topic-level `accuracy` measures review responses (`hard`/`good`/`easy` counted as successful) and must **not** be interpreted as mastery or independently graded correctness.

Read [the complete v0.2 API notes](learning-insights.md) before importing cards from another application.
