# FARK V2 — Student experience foundation

## Audit (2026-11-17)

Scope: inspected `examples/web/index.html`, `examples/web/app.js`, `examples/web/styles.css`, and the existing Studio static regression tests. No real-browser screenshot or device QA has been performed for this change.

### Observed issues
- The first headline advertised scheduling and MCP concepts rather than helping a first-time learner start.
- The welcome CTA was separated from the headline by a second visual block, fragmenting the hierarchy.
- Four feature tabs and advanced controls competed for attention immediately above the question.
- Visual improvements had mostly been incremental CSS, without a coherent student-first landing composition.

### Directions considered
1. **Editorial learning studio**: large typographic hero, calm illustrated scene, one primary action, secondary library action. Keeps a mature academic tone.
2. **Gamified learning world**: characters, streaks, reward maps and richer motion. Potentially engaging, but risks implying fabricated achievements and increases implementation and accessibility cost.

**Selected**: editorial learning studio, with a lightweight original CSS book/orbit illustration. It introduces visual personality without new assets, tracking, or performance-heavy animation.

## Implemented in this PR
- Replaced the technical first-fold introduction with a bilingual learner-focused hero.
- Added a prominent Start Studying action and a working Explore Library shortcut.
- Created a responsive decorative book illustration using CSS; it is marked `aria-hidden`.
- Preserved existing panel IDs, navigation, session controls, learning state, exports, and engine.
- Updated static regression assertions for the new student copy and navigation.

## Next stages
- Simplify the question-card hierarchy without removing recall, skip, or rating controls.
- Create evidence-grounded progress visualizations from existing study summaries, with honest empty states.
- Organize advanced tools behind a clear navigation tier.
- Run `npm test`, browser console checks, keyboard traversal, and visual review at narrow/mobile/tablet/desktop widths before claiming visual QA.

## Known limitations
- This PR is a first-fold redesign, **not** a complete V2 redesign.
- No new study statistics are shown because the hero must not invent progress.
- The UI and automated tests have not been executed in a browser in this work session.
