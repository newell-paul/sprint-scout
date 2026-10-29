# Segment from a ride

Status: done
Opened: 28 October 2026 by Paul Newell

## Problem

Most riders already have the sprint they want to time in a ride on their bike computer, and in Strava. Drawing it again by hand is slow, and the straight lines between clicks don't follow the road. The app can't read Strava, and shouldn't ([findings](../add-segment-flow/findings.md)).

## Proposed outcome

- In the new-segment flow, "From a ride" opens a GPX of the rider's own ride, read in the browser and never sent anywhere, after the same own-recording tick the efforts import uses.
- The ride's track shows on the map. The rider taps the start and the finish on the track, and the segment between them becomes the drawn points, thinned to fit the 500-point limit and reviewable before saving.
- The file is discarded after the segment is made, as with efforts.
- Help text says where to get the file: the bike computer or its app, or Strava's "Export Original" or "Export GPX" on the rider's own activity.

## Affected users and parts

Riders with a ride file, most riders. `apps/web/app/routes/route-drawer.tsx`, `packages/application` (GPX parsing exists for efforts), `packages/analysis` (cutting and thinning a track, deterministic and tested), e2e for the flow, `docs/integration-decisions.md`, `docs/design.md`.

## Constraints

The data-rights gate comes first: an owner entry in `docs/integration-decisions.md`, dated, extending the 13 September 2026 own-recording permission from efforts to segment geometry, before any code. No Strava API, Strava segment pages or route-builder exports. No network request for the file. Deterministic geometry. Depends on [add segment flow](../add-segment-flow/intent.md).

## Open questions

Resolved by the owner on 28 October 2026:

1. Does the owner extend the own-recording permission to segment geometry? Yes. The rider's tick decides whether a Strava "Export GPX" file counts, as it does for efforts.
2. Read FIT as well as GPX? GPX only for now. FIT can come later as its own intent.
3. Can a ride already imported for efforts be reused for a new segment? No. The rider opens the file again, and nothing new is stored.
