# Elevation profile from GPX heights

Status: done
Opened: 1 November 2026 by Paul Newell

## Problem

A segment cut from a GPX ride loses the heights the file recorded. The GPX reader skips `<ele>`, and a saved segment holds only longitude and latitude. Since terrain was removed, the planner shows nothing about a segment's height. The owner's `bridge-to-bridge-up.gpx` has a height on all 90 points (14.4 m at the start, 12.4 m at the finish, 10.1 to 14.4 m in between), and none of it reaches the planner.

## Proposed outcome

- A segment cut from a GPX file with heights keeps them, one per point, for as long as its points are exactly the ones cut.
- Editing the points drops the heights for good. That includes undo after the cut, reverse, an added point and a redraw that changes them. Renaming, or a redraw that leaves the points the same, keeps them.
- The selected segment shows a new Elevation section with a profile of those heights along the segment. It also shows the start and finish heights and the net rise or fall.
- Heights show in metres, or in feet when the speed unit is mph.
- Segments without heights show no Elevation section. That covers drawn segments, files with no `<ele>`, and libraries saved before this change.
- Estimates stay flat road. Heights are shown, never used in the maths.
- No network request. Heights come only from the rider's file.

## Affected users and parts

- **Riders who cut segments from GPX files:** they see the profile.
- `packages/application/src/gpx.ts` reads `<ele>`.
- `packages/analysis/src/track-stretch.ts` carries heights through the cut and the thinning.
- `apps/web`:
  - The library stores and validates heights.
  - The route drawer drops them when the points change.
  - A new elevation section appears in the wind preview.
- Tests:
  - Unit tests for the reader, stretch and library.
  - A component test and ARIA snapshot for the section.
  - e2e on segment-from-gpx.
- Docs: `docs/design.md` and `docs/integration-decisions.md`.

## Constraints

- **Data rights:** heights come from the rider's own file under the existing per-segment source confirmation. No Strava data reaches the repo or any server.
- **Determinism:** any summary of the heights is deterministic and unit tested.
- **Storage:** every saved library still loads. Heights fit inside the 1 MB storage limit, at 500 points per segment.
- **Hosting and budgets:** static hosting, size and Lighthouse budgets.

## Decisions (owner, 1 November 2026)

1. **Scope:** a new section with the elevation profile, shown only when the GPX file has heights.
2. **Edits:** an edited segment shows no heights. Any change to the points drops them.

## Open questions

These are for spec.md, with proposed answers:

1. **Smoothing:** the profile draws the recorded heights as they are, without smoothing.
2. **Storage:** `heightsM` sits beside `points`, rounded to 0.1 m. `null` marks a point with no height.
