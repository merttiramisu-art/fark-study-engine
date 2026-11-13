# Review Forecast, CSV Portability, CLI & TypeScript Types

This document covers the deterministic workload forecast, RFC 4180 CSV deck interchange, zero-dependency CLI, and TypeScript declarations added to **FARK Study Engine**.

## 1. Upcoming workload forecast (`getReviewForecast`)

```js
import { createCard, reviewCard, getReviewForecast } from 'fark-study-engine';

const now = '2026-11-13T12:00:00Z';
const cards = [
  reviewCard(createCard({ id: 'a', topic: 'Math', question: '2 + 3?', answer: '5' }), 'good', now),
  createCard({ id: 'b', topic: 'History', question: 'Year of 1453?', answer: '15th century' })
];

console.log(getReviewForecast(cards, now, 7));
```

- Uses **only** `dueAt` timestamps already scheduled on reviewed cards.
- Unreviewed cards (`reviews === 0`) are counted separately under `unreviewed`; FARK never fabricates future review dates for cards you have not studied yet.
- For any deck and `days` (1–365), `dueNow + sum(schedule[i].dueCount) + later + unreviewed === total`.

## 2. RFC 4180 CSV decks (`fark-study-engine/csv`)

```js
import { exportStudyCsv, importStudyCsv } from 'fark-study-engine/csv';

const csv = exportStudyCsv(cards, { escapeFormulas: true });
const importedCards = importStudyCsv(csv, { idPrefix: 'bio' });
```

- **Content portability:** CSV carries `id`, `topic`, `question`, and `answer` (or `topic,question,answer` without `id`, in which case deterministic IDs like `card-0001` are generated).
- **Use JSON for history:** Use `fark-study-engine/portable` when you need to preserve `box`, `dueAt`, `reviews`, `lapses`, and self-reported `reasonCounts`.
- **Spreadsheet safety:** Pass `{ escapeFormulas: true }` when exporting CSV files meant for Excel, LibreOffice Calc, or Google Sheets so cells beginning with `=`, `+`, `-`, `@`, tab, or CR are prefixed with `'`.
- **Strict validation:** Unknown columns, missing required columns, malformed quotes, mismatched row widths, duplicate IDs, and inputs exceeding 10,000 cards or 2,000,000 characters are rejected.

## 3. Zero-dependency CLI (`fark`)

Run locally with `node bin/fark.js` (or `fark` when installed):

```bash
node bin/fark.js init cs.tsv --pack computer-science
node bin/fark.js study starter.json --limit 5 --strategy sm2 --reason-aware --save
node bin/fark.js validate cards.csv
node bin/fark.js convert cards.csv --to tsv --out anki.tsv
node bin/fark.js summary deck.json --at 2026-11-13T12:00:00Z
node bin/fark.js plan deck.json --limit 6 --topic-limit 2 --new-limit 2 --reason-aware
node bin/fark.js forecast deck.json --days 7 --json
node bin/fark.js compare good,good,again,easy
node bin/fark.js simulate --cards 40 --days 30 --profile missed-days
node bin/fark.js mcp
```

All commands exit with `0` on valid input and `1` with an explicit error on invalid input or malformed decks.

## 4. Zero-dependency MCP Server (`fark mcp` / `fark-study-engine/mcp`)

Connect any stdio JSON-RPC 2.0 MCP client (Claude Desktop, Claude Code, etc.) directly with zero third-party SDKs:

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

Available tools: `fark_validate_deck`, `fark_get_study_summary`, `fark_plan_session`, `fark_forecast_workload`, `fark_compare_strategies`, `fark_simulate_cohort`, and `fark_convert_deck`.

## 5. TypeScript support

Bundled `.d.ts` declarations (`types/*.d.ts`) cover `.`, `./planner`, `./portable`, `./csv`, `./markdown`, `./strategies`, `./interchange`, `./widget`, and `./mcp` with zero runtime overhead.

## Türkçe özet

- `getReviewForecast(cards, at, days)`: Yalnızca mevcut planlı tekrar tarihlerini kullanarak gelecek `N` günün (24 saatlik pencereler) tekrar yükünü sayar; hiç çalışılmamış kartları `unreviewed` olarak ayrı tutar.
- `fark-study-engine/csv`: Öğretmen ve öğrencilerin elektronik tablolardan kart içeriği (`topic,question,answer` veya `id,topic,question,answer`) alıp verebilmesi için sıfır bağımlılıklı RFC 4180 CSV desteği sunar; tam tekrar geçmişi için JSON (`./portable`) önerilir.
- `fark` CLI (`bin/fark.js`): Ek kurulum gerekmeden terminalden deste doğrulama (`validate`), özet (`summary`), oturum planlama (`plan`), tekrar tahmini (`forecast`) ve JSON/CSV dönüştürme (`convert`) işlemlerini çalıştırır.
- TypeScript tipleri (`types/*.d.ts`): Paket alt yollarının tamamı için `.d.ts` tip tanımları içerir.
