# FARK Interactive Lab

A **real browser example** for the FARK Study Engine, built with plain HTML, CSS and JavaScript, without a framework, network dependency or commercial API.

## Run locally

Requires Node.js 20+.

```bash
npm run demo:web
```

Open **http://127.0.0.1:4173/examples/web/** in your browser. Stop the local server with Ctrl+C.

You can also try the static browser-only demo directly on GitHub Pages (all state stays in your browser tab memory; nothing is uploaded): [merttiramisu-art.github.io/fark-study-engine](https://merttiramisu-art.github.io/fark-study-engine/).

## What you can try (v0.6.0 4-Tab Studio)

1. **Study Studio tab:** Adjust session/topic/new-card caps and switch between **Balanced**, **Gentle**, **Intensive**, **SM-2 Adaptive** (`sm2`), and **DSR Memory** (`dsr`), toggle **Reverse Q ↔ A** or **Reason-aware focus** (`reasonAware`), and drill inline `{{cloze}}` prompts with the optional **Recall scratchpad**, keyboard shortcuts (`Space`, `1–4`, `S`), honest skipping, and live **Honest focus signals**.
2. **Strategy Simulator tab:** Run the seeded deterministic 30-day **Cohort Benchmark Lab** across `'steady'`, `'cramming'`, and `'missed-days'` profiles, alongside a step-by-step exact interval trace across all 5 strategies.
3. **Deck Studio & Packs tab:** Switch between 4 original curated sample packs (**General Mix**, **CS & Algorithms (Cloze)**, **Cell Biology**, **EN ↔ TR Vocab**), add single/Cloze cards, bulk-paste Markdown `Q :: A` or Anki/Quizlet `.tsv` lines, search/filter/delete cards, and export/import **JSON** (both standard decks and `fark-study-ledger` files), **CSV**, **TSV**, or **Markdown**. For standalone embeds on any site, see [`<fark-study-deck>` Web Component demo](../examples/widget-demo.html).
4. **Learning Intelligence tab:** Inspect live append-only ledger events, DSR **Brier calibration score**, prerequisite graph **Evidence & closed-loop tracking**, click **Seal & Track Intervention +** to freeze baseline metrics, complete follow-up reviews, audit post-intervention deltas, and download the full **Learning Ledger (MCP JSON)**.

## Why it is not an AI tutor

The interface calls the actual `reviewCard`, `getStudySummary`, `getTopicSummaries`, `planStudySession`, `exportStudyDeck` and `importStudyDeck` functions. It never generates fake metrics or guesses why someone got a question wrong.

The plan alternates due cards across topics under configurable limits. The label "previous mistakes" represents recorded `again` ratings, **not an assessment of ability**. Recall statistics are self-reported, not externally graded accuracy or scientifically verified learning.

## Privacy and security

- The example starts with **synthetic, original educational prompts**, not any real exam questions or student records.
- There are **no cookies, analytics, user accounts, network APIs, web fonts, CDNs or localStorage** in the UI.
- All ratings and imported records stay **in this browser tab's memory**. Closing or refreshing the tab resets them.
- The optional **Export JSON** button downloads a **plain-text** backup; it is *not encrypted*. Treat exported study data as private.
- The local Node HTTP server uses an explicit file allowlist, binds only to `127.0.0.1`, sets a restrictive Content Security Policy and serves nothing from private project repositories.

## Phone preview and accessibility

Automated Chromium QA checks 360 × 640, 393 × 852 and desktop widths and publishes 7-day screenshot artifacts. See [mobile browser QA](mobile-qa.md). A real Android/iPhone and screen-reader audit is **still pending**.

## Tests

The repository's zero-dependency `npm test` checks browser asset syntax, HTML-to-script element references, local module imports, the absence of external requests, server routing and headers, and basic HTTP behavior. These complement the existing core-engine tests.

This is a prototype; browser rendering, accessibility and learning outcomes need additional evaluation. Suggestions and careful bug reports are welcome.

## Türkçe özet

Bu örnek, FARK'ın gerçek tekrar ve oturum planlama kodunu tarayıcıda deneyebileceğin **yerel bir laboratuvar**. Kullanıcı hesabı, API, takip kodu veya sunucuya veri gönderimi bulunmaz. `npm run demo:web` ile açılır; tarayıcıyı yenileyince örnek veriler sıfırlanır. JSON dışa aktarma isteğe bağlıdır ve indirilen dosya şifreli değildir.
