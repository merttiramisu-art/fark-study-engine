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

## Import an educator-authored curriculum (V1.1)

The Concept Map page now offers a **local-only Markdown / JSON editor** and a file selector for explicit `.md`, `.markdown` or `.json` files up to **1 MiB**. A second original fictional Markdown sample contains three shape concepts, two declared prerequisite links and two example questions. Select **Validate and build concept map** to replace the five-concept default graph with the authored graph.

The same `importMarkdownContentPack` and `importOpenContentPack` APIs are used as in FARK's other demos; `buildConceptMap` then enforces the stricter visual graph bounds (150 outcomes / 600 declared edges). Unknown prerequisites, cycles, duplicate IDs, malformed questions and unsupported formats are rejected. **Failures preserve the existing graph and in-memory answer history**; successful imports reset that history, selected concept, active question and observed status. This prevents mixing evidence from different curricula, including those reusing question IDs.

Below the concept layers, an exact, accessible text list shows each `from → to` *declared outcome prerequisite*. Layer connectors represent depth only, not inferred links. Course names, labels, questions and author-supplied provenance are inert text, not HTML. License declarations are self-reported, not verified. The browser has a no-network `connect-src 'none'` CSP. The file picker reads locally through `File.text()` with no upload or persistent storage.

This is still **not a general Markdown parser**, unrestricted graphing engine, learner account, or history synchronizer. Real educator tests, physical file-chooser usability and screen-reader acceptance remain pending.

**Türkçe:** Eğitimci kendi FARK Markdown veya JSON ders paketinden kavram haritası oluşturabilir. Dosya cihazda okunur, sunucuya gönderilmez. Yeni müfredat kabul edilince eski örnek cevap kayıtları temizlenir. Hatalı içerik sağlam haritayı ve kayıtları değiştirmez.

## Selected concept → explained learning path (V1.2)

When a concept is selected, the adjacent panel calls the **public, read-only** `getConceptStudyPath` API. It reports declared prerequisite observations, the latest current response, and a defensible next action.

- No valid answer: offer an unanswered editorial question when available. An unanswered concept is not a failure.
- Most recent answer correct: record a correct observation, **not** mastery; do not infer a remedial need from an older wrong answer.
- Most recent answer incorrect: use the existing `getLearningNextStep` orchestration to show a matching author-supplied lesson, or explicitly state when none exists.
- The learner presses **I reviewed this lesson** to call `recordTeachingCompletion`. It is a self-report, not verified reading.
- Only after completion: `issueReassessment` issues a **different, never-answered question**. A new original `q-compare-followup` sample supports a full path.
- The first post-issuance response is checked by `verifyIssuedReassessment`. Correctness is an observation, never durable mastery or evidence that the lesson caused a change.

Imported content may have no second question. In that case the UI explains `no-reassessment-question` and does not forge one. Each answer, lesson review and question issuance requires an explicit user interaction.

Switching a curriculum or pressing reset clears the **assessment history, teaching self-reports, issuance ledger and active verification**, so no old evidence crosses curricula. Failed imports preserve all valid state. Browser events use monotonically advancing demonstration timestamps.

Prerequisite statuses are descriptive and never gate content. No causal prerequisites, diagnoses, learning efficacy or calibrated mastery probabilities are claimed. Multiple outcomes aligned to one question share evidence.

**Türkçe:** Öğrenci kavramı seçtiğinde FARK son geçerli cevaba dayanarak sıradaki adımı gerekçelendirir. Yanlış cevapla ilişkili özgün ders gösterilebilir. Öğrenci dersi incelediğini belirttikten sonra, mevcutsa farklı bir soru gerçekten düzenlenir ve ilk cevabı doğrulanır. Tek doğru cevap kalıcı öğrenme kanıtı değildir.
