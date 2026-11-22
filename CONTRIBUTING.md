# Contributing to FARK Study Engine / Katkı Rehberi

Contributions in English or Turkish are welcome. This is a zero-dependency, offline-first, MIT-licensed learning engine. Maintainer review and merge timelines are not guaranteed.

## Five-minute development setup

Prerequisite: Node.js 20+ and Git. No API key, account, paid SDK, or dependency installation is required.

```sh
git clone https://github.com/merttiramisu-art/fark-study-engine.git
cd fark-study-engine
npm test
npm run demo
npm run demo:session
node examples/external-consumer.mjs
```

See [External consumer quick start (EN/TR)](docs/EXTERNAL_CONSUMER_QUICKSTART.md) for the minimal public-package API example and its limitations.

For the local browser demo, run `npm run demo:web` and open `http://127.0.0.1:4173/examples/web/`.

## Choose a contribution

- **Bug report:** describe the input, actual and expected results, Node version, and a minimal reproduction. Do not attach real student data.
- **Documentation:** correct inaccurate examples, improve accessibility or translate technical guidance.
- **Tests:** add a deterministic regression test for a documented behavior or edge case.
- **Feature:** open an issue describing the use case and API compatibility impact before large changes.

## Development and PR checklist

1. Create a focused branch; keep unrelated changes out of the PR.
2. Preserve public API compatibility unless the change is explicitly discussed.
3. Add or update `node:test` tests for behavior changes, including failure cases.
4. Run `npm test` and relevant demos. If something cannot be run, state why.
5. Update the corresponding TypeScript declaration and documentation for API changes.
6. Describe **what changed**, **why**, **how it was tested**, and **remaining limitations** in the PR.
7. Treat simulated or observational learning results as such; do not claim proven mastery or causal effectiveness.

## Privacy, security and licensing

Never submit copied exam questions, textbooks, private project source, student records, credentials, or secrets. Use small original synthetic fixtures. Avoid tracking, unexpected network calls, and paid dependencies. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md), not in a public issue.

## Türkçe kısa özet

Node.js 20+ ile depoyu klonla, `npm test` çalıştır ve küçük, bağımsız bir dalda değişiklik yap. Davranış değişikliklerine test ekle; API değişirse TypeScript tanımını ve belgeleri güncelle. Özel öğrenci verisi, telifli soru, gizli anahtar veya ücretli bağımlılık ekleme. PR açıklamasında test sonuçlarını ve kalan riskleri dürüstçe belirt.
