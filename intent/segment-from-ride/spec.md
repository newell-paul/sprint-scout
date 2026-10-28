# Spec: segment from a ride

From [intent.md](intent.md). Data rights: [integration decision, 28 October 2026](../../docs/integration-decisions.md).

## Behaviour

- While a new segment is being drawn (no saved segment open), the segment editor has a "From a ride" section beside "Enter coordinates instead". It says where to get a file: "Use a GPX of your own ride: from your bike computer or its app, or Strava's Export GPX or Export Original on your own activity." It has the own-recording tick, with the efforts import's wording, and an "Open GPX ride" file input that stays disabled until the tick is on.
- Opening a valid file draws the whole ride on the map as a muted line under the segment line, and fits the map to it. The drawing bar reads "Tap the start of your segment on the ride."
- Tapping the map while a ride is open picks a point on the ride and adds no drawn point. The first tap picks the start at the ride point nearest the tap. The second tap picks the finish at the nearest ride point after the start, so a lap ridden twice is cut in riding order. A third tap starts over with a new start. A tap more than 200 m from the ride picks nothing, and the bar says "Tap on the ride's line."
- Two sliders, "Segment start" and "Segment finish", show and set the same picks as a distance along the ride ("1.24 km"), for keyboard and screen-reader use. The finish can't go to or before the start, and the start can't go to or past the finish.
- With both ends picked, the ride points between them, thinned to at most 500, become the drawing's points. The usual Start and Finish labels, arrows, point count, name, independent-source tick and Save apply as for a drawn segment. The bar reads "Segment cut from your ride. Tap to pick a new start, or save below."
- "Close ride" removes the ride line and sliders and keeps any points already cut. Saving, Cancel, Escape and switching tabs also close the ride. A ride is never kept: Restore brings back a discarded drawing's points, not its ride.
- File errors use the efforts import's checks and messages (over 25 MB, not GPX, no timed track points, no time zone), shown in the section's status line. The previous ride, if any, stays.
- Phones: the section and sliders fit the editor's width. A tap on the ride uses the same map activation as drawing.
- The footer's Data & privacy text adds: "A ride opened to make a segment is read in this browser, and only the segment you save is kept."

## Data and privacy

The file is read with `File.text()` in the browser. Nothing from it is sent or stored except the saved segment's points, which go through the existing save, tick and storage. No request follows opening a file or picking points; the e2e test asserts it.

## Calculations

In `@scout/analysis/track`:

- `alongTrack(track)`: cumulative great-circle metres, using turf distance as the rest of the package does.
- `nearestOnTrack(track, point, from = 0)`: the index at or after `from` with the least distance to `point`, and that distance. Ties go to the earliest index.
- `thinTrack(points, max)`: Douglas–Peucker on a local equirectangular projection, with an explicit stack. The tolerance starts at 1 m and doubles until at most `max` points remain. The ends are always kept, and consecutive duplicates are dropped first.
- `segmentFromTrack(track, start, finish, max = 500)`: requires `0 ≤ start < finish < track.length`, then returns `thinTrack(track.slice(start, finish + 1), max)`.

All are pure and deterministic, with 100 % coverage and property tests with a fixed seed: thinning keeps both ends, keeps order and never exceeds `max`, and every kept point is a track point.

## Tests

- Unit: the four functions, including loops, ties, a single-leg cut, a straight line thinning to its two ends, a 250,000-point track within 500, and invalid ranges.
- Component (`ride-source.browser.test.tsx`): the input is disabled until the tick; a bad file shows its message and keeps the previous ride; a good file calls `onOpen` with the track; the sliders call `onPick` and respect the start-before-finish rule; Close calls `onClose`. Axe runs as in every component test.
- E2E (`ride.spec.ts`, chromium projects and webkit-a11y): open the two-laps fixture, check the bar text, set both sliders, see the point count, tick and save, and the segment tab appears. A map tap on the ride moves the bar to "Now tap the finish on the ride." No request is made after opening the file. An ARIA snapshot of the editor with a ride open is added by the runner.

## Docs

`docs/design.md` entry "Segment from a ride — 28 October 2026". The README's feature paragraph mentions it.
