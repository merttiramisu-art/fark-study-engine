# FARK Visual Learning V1 — Number line and fictional chronology

Visual Learning is an original, offline, dependency-free **presentation layer** on top of FARK Open Content Pack and the strict FARK Markdown authoring subset. Existing fraction comparison and public learning APIs remain unchanged.

## Try the live local demo

```sh
npm run demo:web
```

Open `http://127.0.0.1:4173/examples/web/visual-learning.html`. Choose Number line or Chronology, edit the local Markdown lesson, or paste a compatible original JSON pack and click **Validate and preview lesson**. The page displays only validated, author-supplied text and models.

## JSON lesson visual shapes

Number line:

```json
{"kind":"number-line","min":-5,"max":5,"points":[-3,0,4]}
```

Signed integer bounds: min/max within -12..12, min strictly less than max; between one and eight distinct marked points, each in range. The rendered ticks reflect integer locations of equal spacing. User-provided point arrays are not mutated; normalized points are sorted.

Chronology:

```json
{"kind":"timeline","events":[
  {"id":"event-1","year":1860,"label":"Fictional archive founded"},
  {"id":"event-2","year":1872,"label":"Fictional reading room opens"}
]}
```

Two to eight events, unique canonical IDs and bounded integer years from -3000 to 3000. Events are sorted by year (and ID for ties). **The engine does not verify historical accuracy**. Negative years are merely numerical ordering positions, not a BCE/CE calendar convention or evidence about dates.

## Restricted Markdown declarations

Place visual fields in a `## Lesson: id` block *before* `### Body`.

Number line:

```md
visualKind: number-line
visualRange: -5..5
visualPoints: -3,0,4
```

Chronology:

```md
visualKind: timeline
visualEvents: 1860|Fictional archive founded,1872|Fictional reading room opens,1895|Fictional library expands
```

Events are comma-separated `year|label` records. The restricted syntax does not permit commas or vertical bars within event labels. If an author needs richer event text, use JSON v1. Each event is assigned a stable per-document `event-1`, `event-2`, ... ID before validation. Unknown or mixed visual fields fail closed. Legacy `visualLeft`/`visualRight` fraction lessons remain supported without `visualKind`.

## Public API and testing

```js
import { buildNumberLineModel, buildTimelineModel } from 'fark-study-engine/visual-learning';
const numberLine = buildNumberLineModel({min:-5,max:5,points:[-3,0,4]});
const timeline = buildTimelineModel({events:[
  {id:'a',year:1860,label:'Fictional start'},
  {id:'b',year:1872,label:'Fictional change'}
]});
```

- Node.js 20/22 regression and standalone offline npm-tarball installation tests cover the public entry points.
- Chromium mobile/responsive QA exercises original Markdown, timeline sorting, malformed content rollback, literal hostile HTML text, JSON preview and overflow at 360 / 393 / 1280 px.
- No third-party source, images, logos or hosted dependency are included. No API keys, data persistence or network fetches.
- CSS/DOM illustration uses native HTML. Avoid `innerHTML`; all imported labels/bodies are inserted using `textContent`.
- **Not certified:** screen-reader usability on physical devices, comprehensive WCAG audit, classroom effectiveness, or accuracy of historical dates.

## Türkçe

Artık FARK'ın Bilgi Çekirdeği'ne bağlı derslerde yalnızca kesir değil, **sayı doğrusu** ve **kronoloji** de gösterilebiliyor. Eğitimci kendi JSON/Markdown dersinde sayıları veya kurmaca olayları tanımlar; sistem bunları doğrular ve mobilde görselleştirir. Bilinmeyen alanlar reddedilir, eski sağlıklı ekran bozuk veriyle değiştirilmez. Bu modeller ne tarih bilgisini bağımsız doğrular ne de öğrencinin kalıcı öğrenmesini kanıtlar.
