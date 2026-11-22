# FARK Study Desk V1 — one integrated original teaching experience

## Purpose

Study Desk connects the project's existing offline **Content Bridge**, **Concept Map**, **Visual Math**, **Visual Learning**, **Assessment History**, **Teaching History**, and **Issued Reassessment Ledger** on one responsive page. It is not a new learning diagnosis model, and it neither creates learner answers nor scores durable mastery.

## Run entirely on your own computer

```sh
npm run demo:web
```

Open `http://127.0.0.1:4173/examples/web/study-desk.html`. The demo does not use a CDN, network API, account, database, local storage, telemetry or a paid service.

## Original example

The single sample `examples/web/study-desk-sample.js` includes four authored outcomes across three fictional/original subjects, editor-declared prerequisite links, four lessons and five answer-key questions. It demonstrates three *validated* lesson visual types without fetching any image or external library:

- `fraction-comparison`: same-sized whole segmented into exact parts, with an explanation from `compareFractionModels`.
- `number-line`: signed integer ticks and explicitly marked positions from `buildNumberLineModel`.
- `timeline`: invented dates and labelled fictional events from `buildTimelineModel`, **not historical fact verification**.

An outcome's current lesson is chosen from an explicit `core.resources[].outcomeIds` link and `materials.lessons[]`; a lesson recommended after a wrong answer comes from the existing `getConceptStudyPath` and `getLearningNextStep` engines. The UI does not fabricate a missing lesson or question.

## One learner flow

1. Select an explicitly authored outcome. The read-only public `buildStudyDeskView` returns the matching lesson, optional visual, declared prerequisites and one **unanswered** first question.
2. Answering calls `recordAssessment`. This saves an immutable answer-key observation in browser memory; it never guesses whether the learner understands the concept.
3. On a current incorrect answer, FARK uses the existing orchestration to identify an editorially linked lesson. The user can explicitly click **I reviewed this lesson**; `recordTeachingCompletion` saves only this self-report.
4. Only when a distinct unanswered question is available after that review may the user click **Issue a different question**, backed by `issueReassessment` and a separate issuance ledger.
5. The answer to that issued question is checked using `verifyIssuedReassessment`. Correctness and matching issuance are observed; neither a teaching effect nor long-term mastery is inferred.

The view model never includes the correct answer key in its returned question object. This is nevertheless an **open browser demo**, not a secure high-stakes exam delivery system: source content lives in the browser and is inspectable.

## Change content without mixing evidence

The educator section accepts the project's **restricted** Markdown pack format or FARK Open Content Pack JSON. It validates the entire imported pack plus a fresh study view before replacing the curriculum. On success, assessment history, lesson self-reports, issuance ledger and verification states are all reset; on failure, the existing in-memory course and evidence remain intact. The editor includes the existing original signed-number Markdown sample.

Every imported lesson, question, attribution and event label is displayed via `textContent` or other safe DOM creation, not `innerHTML`. Imported HTML-like strings remain literal text. Source and license attribution is **author-declared, not independently verified**.

## Verification boundaries

Node.js 20/22 tests check the public read-only view model, all three model shapes, no-question/no-lesson cases, read-only input, failure cases and an isolated offline npm-tarball consumer. Chromium responsive QA tests 360 px, 393 px and 1280 px interaction flows, including the issued question, course switching and malformed input rejection.

Passing emulator tests is **not** physical Windows/Android acceptance, a screen-reader audit, learning-science validation, educator field-testing or content copyright verification. Those remain future manual acceptance tasks.

## Türkçe özet

FARK Ders Deneyimi tek ekranda **konu → özgün anlatım → görsel → soru → kayda dayalı açıklanabilir sonraki adım** sunar. Yanlış cevap olursa varsa ilgili ders gösterilir; kullanıcı dersi incelediğini açıkça belirtirse aynı kazanım için farklı bir soru düzenlenebilir. Bu uygulama ne öğrencinin gerçekten öğrendiğini kanıtlar ne de geçmişten öğrenci profili uydurur. Tüm örnekler özgün, çevrimdışı, zorunlu kütüphanesizdir.
