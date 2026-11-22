/**
 * Original, fictional, editable Markdown curriculum for Concept Map import QA.
 * A separate sample from the five-concept default: three outcomes, two links.
 */
export const CONCEPT_AUTHORING_SAMPLE = `# FARK Content Pack
version: 1
title: Original Shape Connections
creator: FARK Study Engine contributors
license: MIT

## Unit: shapes
label: Original shapes

## Outcome: recognize-shape
unitId: shapes
label: Recognize a shape

## Outcome: compare-shapes
unitId: shapes
label: Compare two shapes
prerequisiteIds: recognize-shape

## Outcome: classify-shapes
unitId: shapes
label: Classify shapes
prerequisiteIds: compare-shapes

## Lesson: shape-lesson
revision: 1
title: Compare original shapes
outcomeIds: compare-shapes
### Body
This original lesson describes how to compare the corners and edges of two drawn shapes. No learner success is inferred.

## Question: shape-baseline
revision: 1
outcomeIds: recognize-shape
prompt: Which choice describes a triangle?
correctChoiceId: a
- a | A shape with three straight sides
- b | A shape with four straight sides

## Question: shape-comparison
revision: 1
outcomeIds: compare-shapes
prompt: Which shape has more straight sides, a triangle or a square?
correctChoiceId: b
- a | Triangle
- b | Square`;
