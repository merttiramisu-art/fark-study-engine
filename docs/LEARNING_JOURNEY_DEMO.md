# FARK Learning Journey — "Why this step?"

An **interactive, original and in-memory** example of FARK Study Engine. It is separate from the main Studio, with no accounts, paid dependencies, private KPSS curriculum or real learner data.

## Open it

Requires Node.js 20+. Run `npm run demo:web`, then open **http://127.0.0.1:4173/examples/web/learning-path.html**, or use the link on the Studio homepage.

## What happens

1. **Answer a fictional fraction question.** `recordAssessment` uses an editorial answer key. A correct baseline does not trigger invented remedial needs.
2. **See why the lesson appears.** The wrong answer tagged `denominator-size` is matched to an original editorial resource through `getLearningNextStep`. This is a content link, not a psychological diagnosis.
3. **Confirm that you reviewed the lesson.** `recordTeachingCompletion` records a self-report. Then `issueReassessment` issues a different, previously unanswered question for the same outcome.
4. **Answer and inspect the evidence.** `verifyIssuedReassessment` checks the issued question, timing, revision and first response. Correct and incorrect outcomes are both shown without mastery claims.

The fictional event timestamps are fixed to **2026-01-01** for deterministic demonstrations, not as records of real activity.

## Privacy, accessibility and QA

- State lives in JavaScript memory only; restarting or refreshing clears it.
- No telemetry, network requests, storage, private content or permissions required.
- Responsive layout, native buttons, skip navigation, labelled progress and polite live status updates.
- CI Chromium interaction QA covers **360px**, **393px** and **1280px** layouts through `scripts/mobile-qa.mjs`. Static server allowlist and CSP are covered through `test/learning-path-web.test.js`.
- Still pending: final PC and physical mobile tests, screen-reader testing, and third-party content integration.

## Türkçe kısa not

`npm run demo:web` komutunu çalıştırıp yukarıdaki adresi aç. Özgün kesir sorusunu cevapla; yanlış cevabın varsa ilişkilendirilmiş mini ders görünür. Dersi incelediğini işaretlediğinde FARK farklı bir soru düzenler ve bu soruya verilen ilk cevabı doğrular. **Tek bir doğru cevap kalıcı öğrenme kanıtı değildir.** Veriler yalnızca sayfa belleğinde bulunur.

This is software-behavior evidence, not a classroom-effectiveness study.
