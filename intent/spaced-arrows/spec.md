# Spaced arrows on the segment line: spec

From the accepted intent of 1 November 2026.

## Behaviour

- **Arrows.** The direction chevron is placed by the map along the segment line, one every 80 screen pixels, pointing from start to finish. The gap stays the same as the rider zooms, and a segment shorter than the gap still gets one arrow when it fits. Arrows no longer depend on the points.
- **Dots while drawing.** With no saved segment selected (a new drawing, a cut being drawn or a redraw), every point has a dot, as now.
- **Dots on a saved segment.** The selected saved segment has a dot at its first and last point only, under the existing Start and Finish labels.
- **Line and glow.** Unchanged.
- **Mobile.** The same 80 px gap applies.

## Data and privacy

No change. Nothing is stored or requested.

## Calculations

None. The per-leg bearing helper in the drawer is removed, since the map now turns each arrow to follow the line.

## Tests

- **Unit (`route-features.test.ts`, new):** the route source holds the line and a dot per point while drawing; only the first and last dots for a saved segment; no line for a single point; nothing for no points.
- **Component and e2e:** no ARIA or visual baseline shows the map; none changes. The existing drawing e2e tests still pass.
- **Manual:** Bridge to bridge up and Richmond Park on the dev server show spaced arrows and two dots.

## Docs

`docs/design.md`: "Spaced arrows on the segment line — 1 November 2026".
