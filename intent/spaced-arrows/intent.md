# Spaced arrows on the segment line

Status: done
Opened: 1 November 2026 by Paul Newell

## Problem

The map draws a dot on every point of the selected segment and an arrow in the middle of every gap between points. A hand-drawn segment such as Richmond Park has a handful of points and reads well. A segment cut from a GPX ride has many: Bridge to bridge up has about 90, so the line is buried under about 90 dots and 89 arrows.

## Proposed outcome

- Direction arrows sit along the line at a fixed gap on screen, whatever the number of points, at every zoom.
- A saved, selected segment shows dots only at the start and the finish.
- While drawing or editing, every point keeps its dot, so the rider sees each click.
- Stored points, heights and estimates are unchanged.

## Affected users and parts

- Every rider viewing a segment on the map, most visibly segments cut from GPX files.
- `apps/web/app/routes/route-drawer.tsx`, a new `route-features.ts` with a unit test.
- `docs/design.md`.

## Constraints

Display only: no change to stored data, calculations or network requests. Size and Lighthouse budgets.

## Decisions (owner, 1 November 2026)

1. Arrows at fixed gaps along the line.
2. Saved segments, hand-drawn ones included, show only start and finish dots.

## Open questions

None.
