# Mobile and keyboard QA

The Interactive Lab is a **local browser demo**, not a hosted application or a physical-device certification.

## Automated browser smoke checks

[Mobile Browser QA workflow](../.github/workflows/mobile-qa.yml) starts the actual local demo in Chromium via DevTools, without downloading a third-party testing package. It tests these viewports:

| Viewport | Goal |
| --- | --- |
| 360 × 640 | Small-phone responsive layout and main controls |
| 393 × 852 | Common phone width and longer viewport |
| 1280 × 900 | Desktop layout regression |

The CI test checks that:
- JavaScript modules actually load and show a real FARK question.
- The document has no horizontal overflow at the specified viewport widths.
- Core study and JSON controls have visible, usable horizontal dimensions.
- The **Skip for now → Reveal answer → Rate again** interaction responds.
- Screenshots of all three sizes are uploaded as a workflow artifact for human inspection (retained for **7 days**).

These checks run on **headless Chromium emulation**, not a physical Android/iPhone, and they are **not** a comprehensive WCAG accessibility audit. Passing them does not prove that the app is bug-free or works on every device.

## What we improved

- Buttons have larger touch targets for coarse-pointer devices.
- At narrow widths, skip/reveal actions stack rather than being squeezed side by side.
- Low-contrast small helper text was darkened.
- The oversized phone hero was shortened so the first study question appears sooner.
- Users can **skip without rating** before or after revealing the answer. A skipped card remains due and its review counts are unchanged.
- The summary explicitly distinguishes **rated** from **skipped** cards.
- On revealing an answer, focus moves to the first rating control; on finishing the session, focus moves to the results heading.

## Before calling this production ready

Manual verification still needed:
- Real Android Chrome at approximately 360 × 640 and 393 × 852
- iOS Safari, landscape orientations, system font scaling and dark mode preferences
- TalkBack/VoiceOver spoken labels and navigation
- One-handed interaction and physical keyboard-only navigation
- Contrast audit with a recognized WCAG tool, including all button and disabled states
- Import/export behavior for untrusted JSON, download permissions, and data retention notices

## Türkçe not

Bu rapor **gerçek tarayıcı emülasyonunda** 360 ve 393 piksel genişliklerde yatay taşma ve temel işlem akışının kontrol edildiğini gösterir. Fiziksel telefon ve ekran okuyucu testleri yapılmış gibi gösterilmez. Atlanan sorular doğru/yanlış olarak kaydedilmez, tekrar zamanları değişmez.
