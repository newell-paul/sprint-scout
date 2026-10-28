# Add segment flow

Status: draft
Opened: 28 October 2026 by Paul Newell

## Problem

Adding a segment feels like a trap ([findings](findings.md)).

- After pressing "Add segment" there is no Cancel until a point is placed. Nothing says that picking another segment tab is the way back.
- The first tap on the map only activates it and places nothing, though the guidance says "Tap the map to place your start".
- After the first point every segment tab is disabled. "Cancel drawing" is the last control in the editor, at 1063 px on both a 1280 × 900 and a 390 × 844 screen, so it is off screen while the rider draws.
- Saving needs a name and the independent-source tick as well as two points.

## Proposed outcome

- A bar directly above the map holds "Cancel" and "Undo point" from the moment "Add segment" is pressed, on every screen size. Escape also cancels. Cancel returns to the segment the rider was on.
- The segment tabs never lock. Picking another tab while drawing discards the drawing, like Cancel.
- Discarding a drawing shows "Drawing discarded" with an Undo button, like "Undo delete". No browser dialog and no stored drafts.
- On an empty slot, the tap that activates the map also places the start. On a saved segment the activating tap still places nothing.
- A new segment's name starts as "Segment N", selected when the field is focused.
- The independent-source tick stays, per segment.

Bringing in a segment from the rider's own ride file is a separate intent, [segment from a ride](../segment-from-ride/intent.md).

## Affected users and parts

Every rider adding a segment, first-time riders most. `apps/web/app/routes/route-drawer.tsx`, `segment-slots.tsx`, `packages/ui/src/maplibre.ts` (activation option), map and editor CSS, the drawing e2e specs and ARIA baselines, `docs/design.md` (an entry that replaces the "activating click places no point" rule for empty slots).

## Constraints

No new network request. No Strava data. Segments stay in the browser. The 20-segment and 500-point limits hold. No browser dialogs. Lighthouse and size budgets hold.

## Open questions

1. Can a GPX of the rider's own ride be used as segment geometry? Moved to [segment from a ride](../segment-from-ride/intent.md).
2. Should a GPX already imported for efforts be able to create a segment? Moved to the same intent.
3. Should the independent-source tick change? Resolved: no, it stays per segment as the data-rights gate.
4. Keep an abandoned drawing as a draft? Resolved: no. Discard it, with Undo for the session.
5. Confirm Cancel once points are placed? Resolved: no dialog. Undo is enough.
