# Elevation profile from GPX heights: spec

From the accepted intent of 1 November 2026.

## Behaviour

- **Elevation section.** It shows for a selected segment that has heights, after Shelter and Target in the wind preview.
  - The heading is "Elevation".
  - The profile is an SVG line of height against distance along the segment, from start to finish.
  - The line draws the recorded heights as they are, without smoothing (resolves intent question 1).
  - The vertical range is the segment's lowest to highest height, never less than 10 m, so a few metres of GPS noise don't look like a hill.
  - A caption under the profile gives the lowest and highest heights and says they were recorded by the GPX file.
- **Summary line.** It reads "Start 14.4 m · Finish 12.4 m · Falls 2.0 m". It says "Rises" when the finish is higher, and "Level" when the start and finish are within 0.05 m.
  - In metres, values show one decimal place.
  - With the mph speed unit, values are in whole feet ("Start 47 ft · Finish 41 ft · Falls 6 ft"). The net change is always the difference of the two shown values, so the line adds up, and it reads "Level" when that difference is zero.
- **Accessibility.** The SVG has `role="img"` and an `aria-label` naming the start, finish, lowest and highest heights, for example "Elevation profile: start 14.4 m, finish 12.4 m, lowest 10.1 m, highest 14.4 m".
- **No heights.** There is no section and no hint. That covers drawn segments, files without `<ele>`, segments whose heights were dropped, and libraries saved before this change.
- **Heights for a whole cut.** A segment gets heights only when every point kept by the cut (or by Use whole track, or by a whole file from a multiple selection) has a usable height. One missing height means no heights for that segment. The cut itself works as before.
- **Edits drop heights.** Heights are saved only when the saved points are exactly the points they came with. Undo after the cut, reverse, an added point and a redraw that changes the points all save the segment without heights. A redraw that keeps the points (for a rename) keeps the heights. Shelter and target changes keep them.
- **Mobile.** The SVG scales to the panel width with a fixed aspect ratio, and the summary line wraps.

## Data and privacy

- Heights come only from the rider's file, read in the browser, and are stored in local storage with the segment after the unchanged per-segment source confirmation.
- No request at any step. The Open-Meteo elevation API stays removed.
- Clear data removes them with the segment.

## Calculations

- **GPX reader (`@scout/application/gpx`).** `TrackPoint` gains `ele: number | null`.
  - A point's `<ele>` is used when it parses to a finite number between −500 m and 9,000 m. Otherwise it is `null`.
  - A missing or bad height never skips the point.
- **Stretch (`@scout/analysis/track-stretch`).** `trackStretch` also returns `indices`: the index in the ride of each kept point. A run of repeated positions keeps the first. The drawer reads heights at those indices. Use whole track uses the same function from the first to the last index.
- **Rounding.** Heights are rounded to 0.1 m when the segment is cut.
- **Summary (`@scout/analysis/elevation`, new).** `elevationProfile(points, heightsM)` returns:
  - `distancesM`: cumulative turf distance in metres from the start, one per point.
  - `startM`, `finishM`, `netM` (finish minus start), `lowestM` and `highestM`.
  - It throws when the lengths differ or there are fewer than two points. It is pure and deterministic.
- **Profile coordinates.** Scaling to the SVG box is presentation and stays in the component, as the terrain panel did.

## Storage

- `DrawnRoute.heightsM?: number[]` sits beside `points`.
- No `null` entries, since a segment has heights for every point or none (resolves intent question 2).
- `readLibrary` keeps `heightsM` only when it is an array of the same length as `points` and every value is a finite number from −500 to 9,000. Anything else is dropped, and the segment still loads, because heights are display only.
- Libraries without `heightsM` read exactly as before.

## Tests

- **Unit:**
  - **gpx:** heights read, missing, non-numeric, out of range, and points kept regardless.
  - **track-stretch:** `indices` for plain, repeated and thinned stretches. The property test checks that `indices` is strictly increasing and maps to the returned points.
  - **elevation:** distances, net, lowest and highest, length mismatch and too few points. 100 % coverage.
  - **library:** valid heights kept; wrong length, non-number, out of range and non-array dropped with the segment loading.
- **Component (`elevation-section.browser.test.tsx`):** metres falling, feet rising, level. Each has an ARIA snapshot and an axe run. The wind preview renders no section without heights; its four existing baselines are unchanged.
- **e2e (`segment-from-gpx.spec.ts`):**
  - A pre-cut file with rising heights saves a segment showing "Start 10.0 m · Finish 15.0 m · Rises 5.0 m", and it persists across reload.
  - A file without `<ele>` saves a segment with no Elevation section.
  - Reverse after the cut saves without heights.
- **Fixtures:** `make-gpx.ts` gains a height function. `cut-northbound.gpx` rises evenly from 10 m to 15 m, and `cut-eastbound.gpx` has no `<ele>`. The other fixtures keep their constant 20 m.

## Docs

- `docs/design.md`: "Elevation profile from GPX heights — 1 November 2026".
- `docs/integration-decisions.md`: heights extend the segment-geometry entry.
- `README.md`: one clause on the profile.
