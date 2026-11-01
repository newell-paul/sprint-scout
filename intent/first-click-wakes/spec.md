# First click only wakes the map: spec

From the accepted intent of 1 November 2026.

## Behaviour

- **Waking click.** While drawing (a new segment, a redraw or a ride shown for cutting), the mouse press or tap that wakes the inactive map places no point.
- **Next click.** Once awake, each click or tap places a point, as now.
- **Already awake.** A press on the zoom buttons wakes the map; the next click on the map then places a point, because the map was already awake when it was pressed.
- **Staying awake.** Unchanged: with at least one point drawn, the mouse leaving the map does not put it back to sleep, so the waking click happens once per drawing. With no points it does, and the next visit needs a waking click again.
- **Saved segment.** Unchanged: no click places anything.
- **Hint.** "Click to use the map" on a resting mouse is unchanged and now matches what the click does.

## Data and privacy

No change.

## Calculations

None.

## Implementation

`clickToActivate` again reports the press that woke the map, once (`takeActivation()`), as it did before 28 October. The drawer's map click handler skips that press.

## Tests

- **Unit (`maplibre.test.ts`):** the waking press is reported once for mouse and for touch; a later press is not.
- **e2e (`drawing.spec.ts`):** the waking click places no point and the next one places the start; the "keeps control when the mouse leaves" test clicks twice.

## Docs

`docs/design.md`: "First click only wakes the map — 1 November 2026", replacing the first-tap rule in the add segment flow entry.
