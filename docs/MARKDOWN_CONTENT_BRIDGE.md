# FARK Markdown Content Bridge v1

An original, offline, no-dependency Markdown **authoring subset** that transforms user-owned educational documents into the existing FARK Knowledge Core. This is NOT a full Markdown, remark, unified, HTML, MDX, H5P or QTI parser.

## Try it

    npm run demo:markdown
    node --test test/markdown-content.test.js

Example: `examples/content-packs/original-fractions.md`. The linked JSON counterpart is `examples/content-packs/original-fractions.json`. The regression suite verifies that both create identical validated cores.

## Required format

Start at the first line with `# FARK Content Pack`. Then define one key per line: `version: 1`, `title:`, `creator:`, `license:`, and optionally `sourceUrl:` (HTTPS only). Leave one blank line between blocks.

Available section headers are ONLY `## Unit: id`, `## Outcome: id`, `## Lesson: id`, `## Question: id`, `## Mapping: card-id`. IDs are canonical ASCII letters/digits, dot, dash or underscore, maximum 80 characters.

Unit metadata: `label:` and optional comma-separated `prerequisiteIds:`.
Outcome metadata: `unitId:`, `label:` and optional `prerequisiteIds:`.
Lesson metadata: `revision:`, `title:`, `outcomeIds:` and optional `misconceptionIds:`. A lesson **must** contain a `### Body` marker followed by nonempty text. This body is preserved literally as an inert string; no Markdown-to-HTML conversion occurs.
Question metadata: `revision:`, `outcomeIds:`, `prompt:`, `correctChoiceId:` followed by 2–8 choices in the shape `- choice-id | display text`, optionally ` | misconception=misconception-id`. Choices should not contain literal vertical bars.
Mapping metadata: `questionId:`. It links an external card ID to a question ID without creating learner events.

Example:

```md
# FARK Content Pack
version: 1
title: Original fractions
creator: Example author
license: MIT

## Unit: fractions
label: Fraction basics

## Outcome: compare
unitId: fractions
label: Compare unit fractions

## Lesson: lesson-1
revision: 1
title: Comparing pieces
outcomeIds: compare
### Body
The same whole cut into **3** equal parts has larger pieces than one cut into **4**.

## Question: q1
revision: 1
outcomeIds: compare
prompt: Which is larger?
correctChoiceId: a
- a | 1/3
- b | 1/4 | misconception=denominator-size
```

## API and trust boundary

```js
import { importMarkdownContentPack } from 'fark-study-engine/markdown-content';
const { core, materials, attribution } = importMarkdownContentPack(markdownText);
// Pass core to the original FARK learning APIs.
// Only render materials text using textContent or another safe inert-text API.
```

1 MiB input size and a 20,000-line limit are enforced before parsing. The output is also checked by the original JSON content adapter, including cross-links, cycles, unique identifiers, question answer keys and material length limits. Unknown sections and fields are rejected instead of silently ignored.

Never use untrusted imported material in `innerHTML`, MDX evaluation, arbitrary script execution or auto-fetched remote assets. License/creator information is supplied by the author; FARK cannot verify its truth. Do not import private KPSS materials or copyrighted question banks into a public repository.

## Türkçe

Eğitimci, dersini ve sorularını bu dar Markdown biçiminde yazabilir; FARK aynı dosyayı güvenli JSON içerik adaptöründen geçirerek Bilgi Çekirdeği'ne dönüştürür. Soru şıkları ve cevap anahtarı açıkça tanımlanır; ders metni **çalıştırılmaz**, düz metin olarak korunur. Genel Markdown, görsel, gömülü HTML veya karmaşık belge desteği iddia edilmiyor. İleride remark/unified için ayrı, isteğe bağlı dönüştürücü eklenebilir; çekirdek bağımlılıksız kalır.

## Limitations

- Does not render mathematics, images, Markdown syntax or accessibility-rich layouts; these belong to a separately reviewed optional UI layer.
- No remote content fetch or file write. Parsing a document never asserts student mastery, teaching effectiveness or valid intellectual-property rights.
- Multiline question prompts and quoted metadata are intentionally unsupported in v1. Use the future richer format converter or JSON v1 for those cases.
- Source-specific format adapters and real teacher/learner usability testing are still pending.
