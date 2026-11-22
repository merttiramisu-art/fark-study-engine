/** Original, wholly fictional sample teaching content for FARK Visual Learning. */
export const NUMBER_LINE_SAMPLE = `# FARK Content Pack
version: 1
title: Signed numbers visual lab
creator: FARK Study Engine contributors
license: MIT

## Unit: integers
label: Signed numbers

## Outcome: locate-integers
unitId: integers
label: Locate integers on a number line

## Lesson: signed-positions
revision: 1
title: Left of zero, right of zero
outcomeIds: locate-integers
visualKind: number-line
visualRange: -5..5
visualPoints: -3,0,4
### Body
Negative numbers are left of zero; positive numbers are right of zero. The marked positions are -3, 0 and 4. This is an original example, not a learning assessment.

## Question: signed-practice
revision: 1
outcomeIds: locate-integers
prompt: Which number is located to the left of zero?
correctChoiceId: a
- a | -3
- b | 4`;

export const TIMELINE_SAMPLE = `# FARK Content Pack
version: 1
title: Fictional town chronology
creator: FARK Study Engine contributors
license: MIT

## Unit: local-stories
label: Fictional community stories

## Outcome: sort-events
unitId: local-stories
label: Place fictional events in chronological order

## Lesson: town-events
revision: 1
title: A fictional reading town
outcomeIds: sort-events
visualKind: timeline
visualEvents: 1860|Fictional archive founded,1872|Fictional reading room opens,1895|Fictional library expands
### Body
These invented events show how a timeline orders moments. They are not claims about an actual town, historical institution or educational result.

## Question: earliest-event
revision: 1
outcomeIds: sort-events
prompt: Which invented event happened first?
correctChoiceId: a
- a | Fictional archive founded
- b | Fictional library expands`;
