# FARK Visual Math Lab — original, offline fraction explorer

FARK now provides an optional, accessible *visual presentation layer* for original fraction examples. Its deterministic model lives in `src/visual-math.js`; the interactive demo runs at `/examples/web/visual-math.html` under the local static server.

## Run

```sh
npm run demo:web
```

Open `http://127.0.0.1:4173/examples/web/visual-math.html`. No account, API key, CDNs, telemetry or network dependency is needed. Both fraction bars represent the **same-sized whole**; changing numerator and denominator updates equal-sized partitions and the exact integer-arithmetic comparison. The app demonstrates comparisons such as `1/3 > 1/4`, `2/5 > 2/7`, `1/2 = 2/4`, and zero fractions.

## Public exports

```js
import { createFractionModel, compareFractionModels, renderOptionalKatex } from 'fark-study-engine/visual-math';
const result = compareFractionModels({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 4 });
// result.label === '1/3 > 1/4'; result.mastery === null
```

The numerical model intentionally permits only nonnegative fractions with integer numerators and denominators `1..12`. That is a **demo safety and accessibility bound**, not a limitation of all mathematics in FARK. No learner data or learning-effectiveness scores are generated.

## Optional KaTeX adapter (not bundled)

KaTeX is MIT-licensed: https://github.com/KaTeX/KaTeX . It can typeset advanced math in an offline front end, but **the KaTeX package, stylesheet, font files and assets are NOT included** in this PR. The built-in demo uses accessible native text by default.

An integrating application may explicitly supply an already-loaded, **locally distributed** KaTeX instance to the `renderOptionalKatex` function. The browser example looks for `window.katex`; it never fetches a CDN or external package itself. A real KaTeX distribution, its license notices, offline fonts, CSS, CSP requirements and assistive-technology output need separate integration and testing before we claim KaTeX rendering is production-ready.

```js
import { renderOptionalKatex } from 'fark-study-engine/visual-math';
renderOptionalKatex(targetElement, 2, 5, localKatexInstance);
```

The adapter sends **only internally generated numeric TeX** with `trust: false`, `strict: 'error'`, `throwOnError: true`, a limited macro expansion count, and HTML+MathML output. On failure it restores safe text using `textContent`. This function deliberately does not accept arbitrary author-provided TeX; it is not a sanitization promise for generic LaTeX.

## Quality checks

- `node --test test/visual-math.test.js` validates exact comparisons, equivalent/zero cases, boundaries, strict optional KaTeX settings, fallback and renderer failures.
- `node --test test/visual-math-web.test.js` verifies the local static allowlist and CSP. The full Node 20/22 suites include both.
- GitHub Chromium Mobile QA checks actual slider/preset interaction and layout at 360px, 393px and 1280px, and records screenshots for human review.
- Final real-device/browser and screen-reader checks remain pending; screenshot/emulation QA is not physical-device certification.

## Türkçe

**FARK Görsel Matematik Alanı**, özgün kesir derslerinde pay ve paydayı değiştirerek aynı büyüklükte bir bütünün eş parçalarını karşılaştırmayı sağlar. Tamamen çevrimdışı çalışır; kütüphane veya ücretli servis şartı yoktur. Formüller sayısal ve sınırlandırılmıştır. İleride KaTeX'i ayrı, yerel ve lisans bildirimleri korunmuş bir paketle bağlayabiliriz; **henüz gerçek KaTeX dağıtımı eklenmedi**. Ekrandaki karşılaştırma, öğrencinin gerçekten öğrendiğine dair kanıt değildir.
