# FARK Concept Map V1 — explained curriculum connections

An **original, offline, zero-dependency proof of concept** showing only explicitly authored outcome prerequisite links and *observed* answer-key results. It is not a knowledge diagnosis, learning-effectiveness study, skill unlocking system or inferred concept graph.

## Open the interactive example

```sh
npm run demo:web
```

Navigate to `http://127.0.0.1:4173/examples/web/concept-map.html` or use the link from the Studio homepage. The example is original, fictional fraction content with five outcomes, four direct prerequisite links and four editorially authored questions. The app runs entirely in browser memory with no API keys, tracking, learner records or remote calls.

## Public model

```js
import { importOpenContentPack } from 'fark-study-engine/content-adapter';
import { createAssessmentHistory, recordAssessment } from 'fark-study-engine/assessment';
import { buildConceptMap } from 'fark-study-engine/concept-map';
const { core } = importOpenContentPack(myOriginalContentPack);
let history = createAssessmentHistory();
const initialMap = buildConceptMap(core, history);
const result = recordAssessment(core, history, {
  attemptId:'example-1', questionId:'q1', selectedChoiceId:'b',
  at:'2026-01-01T10:00:00.000Z'
});
history = result.history;
const observedMap = buildConceptMap(core, history);
```

Nodes contain ID, exact curriculum label, unit label, declared prerequisite IDs, dependent IDs, question/resource references, answer counts, observation status and `mastery: null`. Edges are only `kind: 'declared-prerequisite'` for existing `outcomes[].prerequisiteIds`. Unit-level `prerequisiteIds` are deliberately **not inferred into additional outcome edges**. Levels represent layout depth, not difficulty, access gating, mastery or readiness.

Possible statuses: `not-observed`, `correct-observed`, `incorrect-observed`, `mixed-observations`. These describe the observed responses, not learner ability. A missing answer is **unknown, not failure**. A single correct response is **not durable mastery**. A question aligned to multiple outcomes shares the same observation; this cannot be counted as multiple independent validation events.

The implementation uses the existing `summarizeAssessments` API, so outdated question revisions and missing questions are excluded and their attempt IDs reported. Input graphs are validated by `validateKnowledgeCore`. An interactive diagram is bounded at 150 outcomes and 600 prerequisite edges; larger curricula require separate UI pagination/virtualization. There are no inferred semantic links or AI-generated prerequisite claims.

## Accessibility and safe presentation

The responsive diagram is presented in explicitly labelled dependency-depth groups. Every concept is a **native button**, with a readable status and a list of its exact prerequisites and dependents. The question chooser records an actual click using the public `recordAssessment` API. A reset action discards the fictional history. All text comes from the validated content pack via `textContent`; there is no `innerHTML` evaluation or foreign content execution.

Node 20/22 tests verify graph structure, stale/orphan rejection, exact answer counters, mixed observations, read-only input, cyclic prerequisite refusal, and public package installation. Chromium QA runs the interactive wrong/correct/mixed/reset/selection flows at 360 px, 393 px and 1280 px. **Physical PC and screen-reader acceptance remain pending.**

## Türkçe

Bu sürüm eğitimcinin **Bilgi Çekirdeği'nde açıkça tanımladığı kazanım ön koşullarını** bir haritada gösterir. Öğrenci örnek soruya cevap verdikçe yalnızca gerçekten kaydedilen doğru/yanlış gözlemleri renkle işaretlenir. Boş olanlar başarısız değildir; yanlış cevap ön koşulun yanlış olduğunu kanıtlamaz. Tek doğru cevap öğrenmenin kalıcı olduğunu göstermez. Bu proje hâlâ açık kaynak MIT, çevrimdışı ve sıfır ücretli API prensiplerini korur.
