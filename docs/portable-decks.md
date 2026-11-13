# Portable study decks (v0.2)

The portable module is an **opt-in, versioned JSON interchange format**, not an automatic backup service. It reads and returns strings and objects only. The integrating app chooses where to save, load, encrypt or delete the output.

## Usage

```js
import { createCard, reviewCard } from '../src/index.js';
import { exportStudyDeck, importStudyDeck } from '../src/portable.js';

const card = createCard({
  id: 'math-01', topic: 'Math', question: '2 + 3?', answer: '5'
});
const reviewed = reviewCard(card, 'again', '2026-11-13T12:00:00Z', {
  reason: 'knowledge-gap'
});

const json = exportStudyDeck([reviewed]);  // plain text, NOT encrypted
const restoredCards = importStudyDeck(json); // validated independent objects
```

For package consumers, the new module is also exposed as `fark-study-engine/portable`.

## Format and safety checks

The exported object has three top-level keys:

```json
{
  "format": "fark-study-deck",
  "schemaVersion": 1,
  "cards": []
}
```

- Both `format` and `schemaVersion` must match; unknown future versions fail clearly rather than getting partially misread.
- Cards must have unique IDs, valid dates, meaningful question/answer text, and consistent counters.
- Each card supports the documented FARK fields only. **Unknown fields throw rather than being silently discarded.**
- Older v0.1 cards with no `reasonCounts` property remain supported. Historical mistake reasons are not guessed.
- The input is limited to 2,000,000 JavaScript string characters and a maximum of 10,000 cards. These are pragmatic limits, not security guarantees.
- A successfully imported deck is returned as new objects. Nothing is written to disk or uploaded over the internet.

## Privacy limitations

**Deck JSON contains question text, answers and learning activity in plain text.** Do not publish personal study decks, sensitive questions, proprietary examination materials, or individual student records. If an app saves this data, encryption, user consent, access control, retention and deletion are the application's responsibility. The format does not prove authenticity or prevent malicious file content by itself.

## Türkçe not

`exportStudyDeck` ve `importStudyDeck`, çalışma kartlarını sürümlü JSON metnine dönüştürür ve geri okur. Kayıt **otomatik yapılmaz**; JSON **şifreli değildir**. Bozuk veriler, tekrar eden kart kimlikleri, bilinmeyen sürümler ve kaybolabilecek ek alanlar reddedilir. Gerçek öğrenci verileri paylaşılmamalıdır.
