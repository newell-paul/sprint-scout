# Spec: wind on/off toggle on the map

## Behaviour

- Once the forecast has loaded and the map is ready, a toggle sits in the map's top-left corner, where the chip was: "Wind" followed by "On" and "Off", the selected half filled in teal on a dark glass pill.
- It is a toggle button named "Wind particles" with `aria-pressed`; pressing it starts or stops the particle field. It starts on.
- It stays when the hour has no wind data; the particle field goes for that hour as before.
- Size: 12 px text and a 26 px pill on desktop, 11 px and 24 px on phones; an invisible hit area takes the tap target to 44 px tall.
- Pressing the toggle does not add a point to a segment being drawn.
- The wind chip (arrow, speed, direction) on the map is removed. The cockpit keeps showing speed and direction.
- The forecast console's "Wind particles on/off" button and "Arrow points where wind blows." caption are removed.

## Data and privacy

No change.

## Calculations

None.

## Tests

- Component (`wind-preview.browser.test.tsx`): the toggle turns the field off and on; a no-wind hour removes the field and keeps the toggle. The ARIA baselines for the forecast console lose the old button; the runner regenerates them.
- E2E: the overlay checks become toggle checks (shown with a forecast, gone when the segment is deleted, present when tiles fail); the mph check stays on the cockpit only; a new check that pressing the toggle while drawing adds no point.

## Docs

`docs/design.md`: "Wind toggle replaces the map chip".
