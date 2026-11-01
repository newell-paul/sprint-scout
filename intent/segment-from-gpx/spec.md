# Segment from GPX: spec

From the accepted intent of 1 November 2026.

## Behaviour

- **Control.** The drawing bar gets a "From GPX" file control (`.gpx`) beside Undo and Cancel. It is enabled only while the draft has no points and no ride is loaded.
- **Loading.** The file is refused before reading if it is over 25 MB. Otherwise `parseGpx` reads it. Its errors show in the status line unchanged ("Not a GPX file.", "GPX track has no usable timed points; …"). Points outside the map's latitude range are dropped. Fewer than two usable points is refused.
- **Ride shown.** A loaded ride draws as a thin light line under the segment layers, and the map fits to it. The status says "Ride loaded from <file>. Tap where your segment starts."
- **Bar text.** With a ride loaded, the bar reads "Tap the ride where your segment starts." and, after the start, "Now tap where it finishes, further along the ride."
- **Start.** A tap or a typed coordinate snaps to the nearest ride point. If there's a tie, the earliest point wins. The snapped point becomes the draft's one point, labelled Start.
- **Finish.** It snaps to the nearest ride point after the start. The draft becomes every ride point from start to finish. Consecutive repeats are dropped, and the stretch is thinned to 500 points if longer. The ride overlay goes, and the status says "<length> km taken from <file>, <n> points. The file was read in this browser only." with " Thinned to 500 points." when it was thinned.
- **Tolerance.** A tap counts when the nearest qualifying point is within 24 screen pixels at the current zoom, and never less than 25 m. Without a map it's 50 m.
  - No ride point within tolerance for the start: "Tap on the ride's line."
  - None after the start: "The ride doesn't pass there after your start. Tap further along it, in the direction you rode."
  - A finish that snaps to a point at the start's position (no movement): the same message.
- **Undo.** With a ride loaded and the start placed, Undo removes the start and keeps the ride. After the finish, Undo works as in a normal drawing.
- **Cancel, Escape, tab switch.** These end ride picking and drop the ride. No Restore is offered for a ride with no stretch cut yet. After the finish, the draft discards and restores like any drawing.
- **Saving.** Unchanged: name (default "Segment N"), the source confirmation, Save segment.
- **Mobile.** The bar wraps as today; the control is a 44 px target like Undo and Cancel.

## Data and privacy

- The file is read with `File.text()` in the browser and kept in memory only until the finish is picked or the picking ends. Nothing about it is stored except the cut points, after Save.
- No network request at any step. Wind loads only for a saved segment, as today.
- The source confirmation is unchanged. The rider decides whether the ride is independent of restricted data, as for efforts.

## Calculations

`packages/analysis/src/track-stretch.ts`:

- `nearestTrackIndex(track, at, toleranceM, after = -1)`: the index of the nearest point with index greater than `after` within `toleranceM`, measured with turf's great-circle distance. Ties go to the earliest index. Returns `null` when none qualifies.
- `trackStretch(track, start, finish, maxPoints = 500)`: takes the points from `start` to `finish` inclusive and drops consecutive exact repeats. If more than `maxPoints` remain, it keeps the points at index `round(i · (n − 1) / (maxPoints − 1))` for `i = 0 … maxPoints − 1`. Returns `{ points, lengthM, thinned }`, with `lengthM` measured along the kept points. It throws when the indexes aren't increasing and within the track, or when fewer than two distinct points remain.
- Both are pure and deterministic, with no I/O.

## Tests

- **Unit (`track-stretch.test.ts`):** nearest with and without `after`, tolerance edges, ties, empty result; stretch inclusive bounds, repeat removal, thinning count and endpoints, length, invalid indexes and the single-position stretch. 100 % coverage.
- **Property (`track-stretch.property.test.ts`, fixed seed):** a thinned stretch never exceeds `maxPoints`, keeps both ends, and is an ordered subsequence of the ride.
- **e2e (`e2e/segment-from-gpx.spec.ts`):**
  - A ride cut by typed start and finish saves a segment, persists across reload and makes no request before the save.
  - A finish against the ride's direction is refused with the message.
  - A non-track file is refused.
  - Undo after the start keeps the ride.
  - Cancel drops it.
- **Page object:** `SegmentEditor.importRide(name)`.
- **ARIA:** no baseline changes. The bar is outside `drawing-ready-to-save`.

## Docs

- `docs/design.md`: "Segment from a GPX ride — 1 November 2026".
- `docs/integration-decisions.md`: a line extending the 13 September 2026 GPX entry to segment geometry.
- `README.md`: one line on adding a segment from a ride.
