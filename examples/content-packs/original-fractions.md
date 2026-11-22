# FARK Content Pack
version: 1
title: Original Fraction Comparison
creator: FARK Study Engine contributors
license: MIT
sourceUrl: https://github.com/merttiramisu-art/fark-study-engine

## Unit: fractions
label: Original fractions

## Outcome: compare-unit-fractions
unitId: fractions
label: Compare unit fractions

## Lesson: fraction-pieces
revision: 1
title: Same whole, different-sized pieces
outcomeIds: compare-unit-fractions
misconceptionIds: denominator-size
### Body
If the same whole is split into 3 equal parts, each piece is larger than when it is split into 4 equal parts. Therefore 1/3 is larger than 1/4. The denominator names how many equal pieces the whole has.

## Question: baseline
revision: 1
outcomeIds: compare-unit-fractions
prompt: Which fraction is larger: 1/3 or 1/4?
correctChoiceId: a
- a | 1/3
- b | 1/4 | misconception=denominator-size

## Question: followup
revision: 1
outcomeIds: compare-unit-fractions
prompt: Which fraction is larger: 2/5 or 2/7?
correctChoiceId: a
- a | 2/5
- b | 2/7
