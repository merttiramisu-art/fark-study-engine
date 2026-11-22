# FARK V6.1 — Reproducible synthetic replay benchmark

This is **an opt-in engineering measurement**, not an educational result or release claim. No real learner data, private KPSS material, external services or paid packages are used.

## Run

Requires Node.js 20+ and a checked-out repository.

```sh
npm run bench:learning -- --sizes=1000,10000,50000,100000 --runs=3 --seed=42
```

For a fast smoke test:

```sh
npm run bench:learning -- --sizes=1000,100000 --runs=1 --seed=42
```

The command outputs structured JSON only, including Node version, OS, architecture, seed, repetition count, SHA-256 of deterministic synthetic inputs, per-run observed wall-clock durations and memory deltas, and median / p95 of the sampled durations.

## Known limit

`src/calibrate.js` currently rejects more than **50,000** events in one review replay. A 100,000-event request is therefore reported as `status: "unsupported"`; no timing or memory number is invented. Raising the limit requires a separate safety and resource review.

## Measurement caution

- Wall-clock duration depends on machine load, CPU, runtime version and warm-up.
- Heap/RSS deltas are *observations*, not peak process memory. Garbage collection may yield negative heap deltas; a bounded peak-memory guarantee is not implied.
- Reported replay results compare predictions with **synthetic, self-reported ratings**. No causal effect or improved human learning is demonstrated.
- CI runs only a small 1k-event smoke benchmark plus the explicit 100k unsupported case. Larger measurements should be performed on a dedicated machine as part of later PC acceptance.
- Keep raw JSON results and environment description when comparing changes; do not use a single run to assert a speedup.

## Türkçe not

Ölçüm tamamıyla sentetik tekrar kayıtlarıyla yapılır. 1.000 / 10.000 / 50.000 olay denenebilir, fakat mevcut 50.000 olay üst sınırı nedeniyle 100.000 olaya **performans sonucu uydurulmaz**. Ölçülen süre ve bellek değerleri çalıştırılan bilgisayarın koşullarına bağlıdır; öğrencinin gerçekten daha iyi öğrendiğini göstermez.
