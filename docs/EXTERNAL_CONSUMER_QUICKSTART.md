# External Consumer Quick Start / Harici Kullanıcı Hızlı Başlangıç

## English

This original, deterministic example exercises FARK's public package exports and does not depend on private KPSS content, cloud services, or real learner data.

Requires Node.js 20+.

```sh
git clone https://github.com/merttiramisu-art/fark-study-engine.git
cd fark-study-engine
node examples/external-consumer.mjs
npm test
```

The example imports from the **public package name** `fark-study-engine`, rather than a private source path. Since it runs inside the repository, Node resolves it by package self-reference; this is an export-contract smoke test, **not** evidence of an independently installed third-party consumer. To try the package in a separate local project without registry publication, install it from a local checkout using `npm install /absolute/path/to/fark-study-engine`.

Expected JSON includes `originalUnchanged: true`, `dueCardIds: ["demo-1"]`, and `totalReviews: 1`.

The algorithm observes a **self-reported rating**; the displayed review or accuracy is not a validated learning outcome.

## Türkçe

Bu örnek FARK'ın herkese açık paket girişini kullanır. Özel KPSS içeriği, ücretli API, internet servisi veya gerçek öğrenci verisi kullanmaz. Node.js 20 veya üzeri gerekir.

```sh
git clone https://github.com/merttiramisu-art/fark-study-engine.git
cd fark-study-engine
node examples/external-consumer.mjs
npm test
```

Örnek, iç kaynak dosyasını değil, doğrudan `fark-study-engine` paket adını içe aktarır. Ancak depo içinde çalıştığından bu bir **paket içi self-reference testi**dir. Başka bir projede gerçek kurulumun doğrulandığı anlamına gelmez. Ayrı bir yerel projede test etmek istersen `npm install /deponun/tam/yolu` komutunu kullanabilirsin.

Beklenen JSON çıktısında `originalUnchanged: true`, `dueCardIds: ["demo-1"]` ve `totalReviews: 1` bulunur.

**Not:** Kişinin kendi verdiği tekrar puanı, gerçek öğrenmenin kanıtı değildir.
