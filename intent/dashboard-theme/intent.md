# Dashboard in the planner's colours

Status: accepted
Opened: 27 October 2026 by Paul Newell

## Problem

The engineering dashboard uses its own near-black palette (`#0b0f19` page, `#111827` cards) while the planner it links from uses slate blue (`#1e2a3a` page, `#263345` panels). Moving between the two looks like two products, and the dashboard reads too dark.

## Proposed outcome

The dashboard uses the planner's page colour, background glow, panel, ink, muted text and border colours, and its cards look like the planner's forecast panel: a translucent slate fill, a thin teal outline, 16 px corners and a soft drop shadow. This is option B of three mock-ups shown on 27 October 2026. Status colour stays in the values, sparklines, rings and meters; the per-card status outline and glow go.

## Affected users and parts

`packages/testing/src/dashboard.ts` (the inline stylesheet), `packages/testing/src/dashboard.test.ts`, `docs/design.md`. No planner change.

## Constraints

The dashboard stays a single static page with no scripts and nothing from another origin. Text keeps WCAG AA contrast on the new panels. Status is never shown by the card frame alone.

## Open questions

None; the owner chose option B.
