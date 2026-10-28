# Add segment flow

Status: done
Opened: 28 October 2026 by Paul Newell

## Problem

Adding a segment feels like a trap ([findings](findings.md)).

- After pressing "Add segment" there is no Cancel until a point is placed. Nothing says that picking another segment tab is the way back.
- The first tap on the map only activates it and places nothing, though the guidance says "Tap the map to place your start".
- After the first point every segment tab is disabled. "Cancel drawing" is the last control in the editor, at 1063 px on both a 1280 × 900 and a 390 × 844 screen, so it is off screen while the rider draws.
- The draw screen has about 16 elements: an empty-slot hint, a four-step strip, a guidance line, a lock message, three edit buttons, two expanders, a name, a tick, Save and Cancel.
- Saving needs a name and the independent-source tick as well as two points.

## Proposed outcome

Drawing is one mode with one control bar, and everything else is cut back:

```text
┌───────────────────────────────────────────────┐
│ Tap the map to place your start.  [Undo] [Cancel] │
├───────────────────────────────────────────────┤
│                      map                      │
└───────────────────────────────────────────────┘
  2 / 500 points · Ride from Start to Finish along the arrows.
  Segment name [Segment 2          ]
  ☐ I created this route independently of Strava …
  [Save segment]
  ▸ Enter coordinates instead
  ▸ Ordered route points   (with Reverse direction)
```

- One bar directly above the map replaces the empty-slot hint, the step strip and the guidance line. Its text follows the drawing: place the start, then the finish, then add bends or save.
- Undo and Cancel sit in the bar from the moment drawing starts, on every screen size. Escape also cancels. Cancel returns to the segment the rider was on, or to the saved segment during a redraw.
- The segment tabs never lock. Picking another tab while drawing discards the drawing, like Cancel.
- Discarding a drawing shows "Drawing discarded." with a Restore drawing button, like "Undo delete". No browser dialog and no stored drafts.
- While drawing, the tap that activates the map also places a point. On a saved segment taps still place nothing.
- A new segment's name starts as "Segment N", selected when the field is focused.
- Name, tick and Save sit directly under the map. Clear drawing goes; Undo and Cancel cover it. Reverse direction moves into the point list.
- Save and the name say "segment", as the rest of the app does.
- The independent-source tick and its wording stay, per segment.

Bringing in a segment from the rider's own ride file is a separate intent, segment from a ride.

## Affected users and parts

Every rider adding a segment, first-time riders most. `apps/web/app/routes/route-drawer.tsx`, `apps/web/app/globals.css`, the e2e drawing and keyboard specs, the editor and library page objects and their ARIA baselines, `docs/design.md` (an entry that replaces the "activating click places no point" rule).

## Constraints

No new network request. No Strava data. Segments stay in the browser. The 20-segment and 500-point limits hold. No browser dialogs. Lighthouse and size budgets hold.

## Open questions

1. Can a GPX of the rider's own ride be used as segment geometry? Moved to the segment from a ride intent.
2. Should a GPX already imported for efforts be able to create a segment? Moved to the same intent.
3. Should the independent-source tick change? Resolved: no, it stays per segment as the data-rights gate.
4. Keep an abandoned drawing as a draft? Resolved: no. Discard it, with Restore for the session.
5. Confirm Cancel once points are placed? Resolved: no dialog. Restore is enough.
