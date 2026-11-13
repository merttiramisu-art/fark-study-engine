# FARK Interactive Lab

A **real browser example** for the FARK Study Engine, built with plain HTML, CSS and JavaScript, without a framework, network dependency or commercial API.

## Run locally

Requires Node.js 20+.

```bash
npm run demo:web
```

Open **http://127.0.0.1:4173/examples/web/** in your browser. Stop the local server with Ctrl+C.

This lab is included in the *draft v0.2 pull request*; it is not currently deployed as a hosted website. Running the command starts a local-only server bound to `127.0.0.1` — not a public deployment.

## What you can try

1. Adjust how many questions to include, the maximum per topic, and the number of new cards, then click **Rebuild plan**.
2. Reveal an answer, self-rate the review with **Again / Hard / Good / Easy**, and optionally select your own reason for an `Again` response.
3. See the **due count, studied count, self-reported recall rating**, and due-versus-total overview by topic change as you work.
4. Export a portable FARK deck as **plain JSON**, or import an existing compatible deck. Import errors, duplicate IDs and unknown schema versions are reported instead of silently dropping data.
5. Reset the example to its original synthetic cards. Refreshing the tab also resets it because no data is persisted.

## Why it is not an AI tutor

The interface calls the actual `reviewCard`, `getStudySummary`, `getTopicSummaries`, `planStudySession`, `exportStudyDeck` and `importStudyDeck` functions. It never generates fake metrics or guesses why someone got a question wrong.

The plan alternates due cards across topics under configurable limits. The label "previous mistakes" represents recorded `again` ratings, **not an assessment of ability**. Recall statistics are self-reported, not externally graded accuracy or scientifically verified learning.

## Privacy and security

- The example starts with **synthetic, original educational prompts**, not any real exam questions or student records.
- There are **no cookies, analytics, user accounts, network APIs, web fonts, CDNs or localStorage** in the UI.
- All ratings and imported records stay **in this browser tab's memory**. Closing or refreshing the tab resets them.
- The optional **Export JSON** button downloads a **plain-text** backup; it is *not encrypted*. Treat exported study data as private.
- The local Node HTTP server uses an explicit file allowlist, binds only to `127.0.0.1`, sets a restrictive Content Security Policy and serves nothing from private project repositories.

## Tests

The repository's zero-dependency `npm test` checks browser asset syntax, HTML-to-script element references, local module imports, the absence of external requests, server routing and headers, and basic HTTP behavior. These complement the existing core-engine tests.

This is a prototype; browser rendering, accessibility and learning outcomes need additional evaluation. Suggestions and careful bug reports are welcome.

## Türkçe özet

Bu örnek, FARK'ın gerçek tekrar ve oturum planlama kodunu tarayıcıda deneyebileceğin **yerel bir laboratuvar**. Kullanıcı hesabı, API, takip kodu veya sunucuya veri gönderimi bulunmaz. `npm run demo:web` ile açılır; tarayıcıyı yenileyince örnek veriler sıfırlanır. JSON dışa aktarma isteğe bağlıdır ve indirilen dosya şifreli değildir.
