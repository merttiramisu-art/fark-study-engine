# FARK — Open-source ecosystem review (2026-11-22)

Snapshot from GitHub's public repository metadata and upstream license/readme files, checked 2026-11-22. Star counts are approximate and not evidence of code safety or permission for every asset. FARK remains MIT, zero mandatory dependencies, offline-first and 0 TL.

| Project | Stars (snapshot) | Repository license | FARK action |
| --- | ---: | --- | --- |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | 136104 | MIT | Optional authoring interface only; do not put React bundle into core |
| [Anki](https://github.com/ankitects/anki) | 32960 | AGPL-3.0-or-later in source | Interoperability ideas; do not copy AGPL source into MIT core |
| [KaTeX](https://github.com/KaTeX/KaTeX) | 20531 | MIT | Candidate optional offline math rendering |
| [MDX](https://github.com/mdx-js/mdx) | 19868 | MIT | Rich content authoring ideas; untrusted content must never become executable MDX |
| [Ajv](https://github.com/ajv-validator/ajv) | 14887 | MIT | Optional developer-side JSON Schema validation, not mandatory runtime |
| [MathJax](https://github.com/mathjax/MathJax) | 10955 | Apache-2.0 | Accessible mathematical typography alternative |
| [remark](https://github.com/remarkjs/remark) | 9044 | MIT | Future opt-in Markdown AST importer |
| [Moodle](https://github.com/moodle/moodle) | 7631 | GPL-3.0-or-later | No source copying; format-only research |
| [unified](https://github.com/unifiedjs/unified) | 5055 | MIT | Modular parse/transform architecture for optional adapters |
| [FSRS4Anki](https://github.com/open-spaced-repetition/fsrs4anki) | 4143 | MIT | Study FSRS algorithm benchmark, not Anki's AGPL implementation |
| [Kolibri](https://github.com/learningequality/kolibri) | 1185 | MIT | Offline educational channel architecture reference, media rights need separate review |
| [xAPI-Spec](https://github.com/adlnet/xAPI-Spec) | 954 | Apache-2.0 | Optional offline learning-event export; avoid tracking/hosted service |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | 886 | MIT | Current v6 needs Node 24+, not suitable for FARK Node 20/22 as mandatory dependency |
| [H5P PHP library](https://github.com/h5p/h5p-php-library) | 156 | GPL-3.0 | Do not copy PHP/GPL source; H5P import needs original adapter and rights review |

## Priority and trust rules

1. Start now: a **new, original** versioned content-pack JSON adapter with explicit but unverified creator/license attribution and safe text display; add no third-party code.
2. Follow up: optional remark/unified Markdown input for educators, strict separation of inert content from executable code.
3. Optional lesson UI: KaTeX math rendering with documented offline assets, bundle/accessible fallbacks and per-file notice checks.
4. Research: FSRS scheduling vs FARK DSR using the same chronological data splits; never make educational effectiveness claims from synthetic results.
5. Later: optional xAPI export and Kolibri/H5P/QTI adapters in isolated modules if justified by real users.

A GitHub star is not a license. MIT/Apache dependencies have notice and attribution obligations, and subassets may have different terms. GPL/AGPL code cannot simply be pasted into a MIT-only codebase; review compatible integration patterns and obligations individually. The package's own license field is NOT proof of provenance. No third-party code/assets copied by this audit.
