# Fark Study Engine 📚

**Türkçe:** Öğrenme uygulamaları için küçük, açık kaynaklı, çevrimdışı çalışabilen bir tekrar planlama çekirdeği. **English:** A tiny, open-source, offline-friendly study review engine.

Fark Study Engine bir KPSS soru bankası veya hazır sınav içeriği değildir. Herhangi bir sınav kurumuyla bağlantısı yoktur. Kişisel öğrenme projelerinde kullanılabilecek, **sıfır harici bağımlılıklı** basit bir JavaScript modülüdür.

It provides four small building blocks:

- **Create cards:** an original question/answer with a topic and a local ID.
- **Schedule reviews:** `again`, `hard`, `good`, and `easy` answers set the next review date.
- **Prioritize mistakes:** overdue/new cards with more mistakes appear first.
- **Show honest progress:** due/new/studied counts, review accuracy (`null` if unknown), and an illustrative maturity indicator.

## Hemen dene / Quick start

Requires Node.js **20 or newer**. No API key, database, paid service, account, or package installation is needed.

```bash
npm test
npm run demo
```

```js
import { createCard, reviewCard, selectReviewQueue, getStudySummary } from './src/index.js';

const now = '2026-11-13T12:00:00Z';
const card = createCard({
  id: 'math-01',
  topic: 'Matematik',
  question: '2 + 3 kaçtır?',
  answer: '5'
});
const updated = reviewCard(card, 'good', now);
console.log(updated.dueAt); // 2026-11-14T12:00:00.000Z
console.log(selectReviewQueue([updated], '2026-11-14T12:00:00Z'));
console.log(getStudySummary([updated], now));
```

**Note:** The module does **not** write any data to disk. Integrating apps decide how to persist cards; the example stores everything in memory. It never connects to a server or sends telemetry.

## How the scheduler works / Algoritma

The transparent review rules are explained in [docs/algorithm.md](docs/algorithm.md). These are illustrative heuristics, **not scientifically validated guarantees** of learning or mastery. The module makes no medical, pedagogical, or exam-performance promises.

## Open-source boundaries

- All example questions are original, generic learning prompts.
- No copyrighted exam questions, commercial textbooks, private project code, credentials, or real student records are included.
- This is a stand-alone public learning utility, not the private KPSS application or its content collection.
- No login, analytics, commercial dependencies, or external API calls.

## Katkıda bulun / Contributing

Issues and small pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Potential future improvements include topic-level statistics, accessible example interfaces, import/export, localization, and tests for real-world scheduling usage. None are represented as complete today.

## License

MIT — see [LICENSE](LICENSE).
