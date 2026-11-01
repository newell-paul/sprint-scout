# First click only wakes the map

Status: done
Opened: 1 November 2026 by Paul Newell

## Problem

On an empty or new segment, the click or tap that wakes the map also places the start, on desktop and phones. The rider clicks into the map to use it and finds a start point they did not mean to place. Since 28 October (add segment flow) that was deliberate; the owner now reports it as a bug.

## Proposed outcome

- On a new or redrawn segment, the click or tap that wakes the map places nothing. The next one places the start.
- Once the map is awake, every click places a point as now.
- Saved segments, the zoom buttons, the keyboard and the GPX cut are unchanged.

## Affected users and parts

- Every rider drawing a segment.
- `packages/ui/src/maplibre.ts` and its unit test; `apps/web/app/routes/route-drawer.tsx`; `e2e/drawing.spec.ts`.
- `docs/design.md`.

## Constraints

No new request; no change to stored data.

## Decisions (owner, 1 November 2026)

1. The first click on an empty or new segment only wakes the map. This reverses the "activating tap places a point" rule of 28 October.

## Open questions

None.
