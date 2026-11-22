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

The example imports from the **public package name** `fark-study-engine`, rather than a private source path. This example uses Node package self-reference. The automated test `node --test test/package-install.test.js` also builds a local npm tarball, installs it **offline into an isolated project**, and imports public entry points. It verifies packaging and installation on tested Node versions, not arbitrary third-party integration. Final PC acceptance remains separate.

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

Örnek, iç kaynak dosyasını değil, doğrudan `fark-study-engine` paket adını içe aktarır. Bu örnek depo içinde paket self-reference kullanır. Ek test `node --test test/package-install.test.js` paketi tarball olarak oluşturur, **bağımsız klasöre çevrimdışı kurar** ve oradan kullanır. Test edilen Node sürümlerindeki paket kurulumu doğrulanır; her üçüncü taraf ortamında çalışacağının garantisi değildir. Son PC kabul testi ayrıca yapılacak.

Beklenen JSON çıktısında `originalUnchanged: true`, `dueCardIds: ["demo-1"]` ve `totalReviews: 1` bulunur.

**Not:** Kişinin kendi verdiği tekrar puanı, gerçek öğrenmenin kanıtı değildir.
