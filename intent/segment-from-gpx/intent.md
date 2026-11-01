# Segment from GPX

Status: accepted
Opened: 1 November 2026 by Paul Newell

## Problem

A segment can only be drawn by hand, tap by tap, as straight lines.

- A rider who has ridden the segment, and has the ride as a GPX file, still redraws it by eye. The line drifts from the road on every bend.
- Import GPX ride exists, but it only matches efforts to a segment that is already drawn. It never creates one.
- A ride file holds no segment names or boundaries (Strava works those out on its own servers), so the planner can't offer a list of named segments from it. The rider has to say where the segment starts and finishes.

## Proposed outcome

- While adding a segment, the rider can choose a GPX ride. The planner shows the whole ride on the map.
- The rider taps the ride where the segment starts, then where it finishes. The stretch of ride between the two taps becomes the draft segment, following the road.
- Coordinates typed in "Enter coordinates instead" pick the start and finish the same way, so it works without a pointer.
- The draft is then an ordinary drawing: the rider can name it, reverse it, undo points, tick the source confirmation and save it. Repeat for each segment wanted from the same ride.
- The file is read in the browser and thrown away. Nothing is uploaded and no request is made.
- A file the planner can't use, or a tap away from the ride, gets a message that says what to do.
- The reference rider and the shelter control are unchanged. Fitting them from recorded efforts is a separate intent.

## Affected users and parts

- Riders with a GPX of a ride over the segment, from any device or service.
- `packages/analysis`: a new pure module that snaps a tap to the ride and cuts the stretch.
- `apps/web/app/routes/route-drawer.tsx`: the import control, ride overlay and picking.
- e2e drawing tests and the editor page object; GPX fixtures.
- `docs/design.md`, `docs/integration-decisions.md`, `README.md`.

## Constraints

- No Strava data in the repo, its fixtures or any server. Fixtures are synthetic.
- The file stays in the browser; no new network request.
- Static hosting, no account, no API keys.
- The 20-segment and 500-point limits hold.
- Cutting and thinning are deterministic: the same file and taps always give the same segment.
- Saved libraries are unchanged; nothing new is stored.
- Size and Lighthouse budgets hold.

## Open questions

1. Data rights. Resolved: the source confirmation stays as it is. Whether a ride file (including one exported from Strava) counts as independent is the rider's judgement at save time, as it already is for efforts (integration decisions, 13 September 2026).
2. Heights. Resolved: not in this intent. The segment stores position only, and estimates stay flat road. Recorded heights and a profile are a later intent.
3. More than 500 points. Resolved: the stretch is thinned evenly by point index to 500, always keeping the start and finish.
4. Files without times. Resolved: refused, as the efforts import does. Route files from planners carry surface-model heights and no recording.
5. A whole ride. Resolved: the rider picks the start and finish on it (option 1). A list of suggested hard efforts is a possible follow-up.
6. Placement. Resolved: a "From GPX" control in the drawing bar, available while the draft has no points.
