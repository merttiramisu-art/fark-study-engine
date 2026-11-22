# FARK content-pack adapter v1

An original, zero-dependency, offline conversion from user-authored JSON to the existing FARK Knowledge Core. No other repository's implementation is copied.

## Run

    npm run demo:content
    node --test test/content-adapter.test.js

Example source: examples/content-packs/original-fractions.json (original MIT-licensed fictional math questions).

## Public API

Import `importOpenContentPack` from `fark-study-engine/content-adapter` and pass a JSON string or a plain structured object. The returned `{ core, materials, attribution, disclaimer }` separates the engine's validated content graph from the display strings.

Top-level pack fields: `format: fark-open-content-pack`, `version: 1`, `attribution`, `units`, `outcomes`, `lessons`, `questions`, and optional `mappings`. Attribution requires a creator, title, license and optionally an HTTPS sourceUrl. Each question needs an answer key and 2–8 choices. Lessons use `bodyText` as plain text, not HTML. Cross-links, duplicates, cycles and a 1 MiB input bound are checked.

The adapter NEVER verifies whether user-supplied rights declarations are true. The author must have reuse rights for all question text, illustrations and media. Return `materials` strings to the UI using `textContent` rather than `innerHTML` to avoid executing foreign markup. Content import does not create learner evidence or mastery estimates.

This is not a native Kolibri, Moodle, H5P, QTI or Anki package importer. Such format-specific converters are separate opt-in work. Keeping the FARK core dependency-free remains nonnegotiable.

## Türkçe

Bağımsız içerik üreticileri kendi özgün ders, kazanım ve soru JSON dosyalarını FARK Bilgi Çekirdeği'ne bağlayabilir. Paketin kaynak ve lisans bilgisi zorunludur ama doğrulanmış sayılmaz. Ders metinleri öğrencinin kayıtlarından ayrı kalır. Herhangi bir ücretli servis ya da zorunlu kütüphane gerektirmez.

## Author lesson packs as Markdown

See [FARK Markdown Content Bridge](MARKDOWN_CONTENT_BRIDGE.md). It is a strict, original authoring subset that converts into this identical validated JSON content pack. No Markdown renderer or executable MDX is part of the importer.
