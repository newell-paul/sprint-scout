# Spec: wind on/off toggle on the map

## Behaviour

- Once the forecast has loaded and the map is ready, a toggle sits in the map's top-left corner, where the chip was: a status dot then "Wind on" or "Wind off" on a dark pill. On, the dot is filled teal with a soft glow and the text is white; off, the dot is a hollow grey ring and the text is muted.
- It is a toggle button named "Wind particles" with `aria-pressed`; pressing it starts or stops the particle field. It starts on.
- It stays when the hour has no wind data; the particle field goes for that hour as before.
- Size: 13 px text and a 28 px pill on desktop, 12 px and 26 px on phones; an invisible hit area takes the tap target to 44 px tall.
- The toggle shows only while a saved segment is open, when map presses never add points, so it cannot add one. It sits outside the map canvas, so its press never reaches the map.
- The wind chip (arrow, speed, direction) on the map is removed. The cockpit keeps showing speed and direction.
- The forecast console's "Wind particles on/off" button and "Arrow points where wind blows." caption are removed.

## Data and privacy

No change.

## Calculations

None.

## Tests

- Component (`wind-preview.browser.test.tsx`): the toggle turns the field off and on; a no-wind hour removes the field and keeps the toggle. The ARIA baselines for the forecast console lose the old button; the runner regenerates them.
- E2E: the overlay checks become toggle checks (shown with a forecast, gone when the segment is deleted, present when tiles fail); the mph check stays on the cockpit only. The pill is opaque so its muted "Wind off" label passes the e2e colour-contrast check over any tile.

## Docs

`docs/design.md`: "Wind toggle replaces the map chip".
