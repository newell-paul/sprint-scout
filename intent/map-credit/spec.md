# Spec: map credit

From [intent.md](intent.md).

## Behaviour

- The credit's (i) button is the height of the credit pill, so one icon shows and nothing sticks out below the pill. Desktop and phones.
- The map's credit is always compact: on load it shows "MapLibre | © OpenStreetMap contributors" with the (i); five seconds after the street map is added, or on the first drag, it shrinks to the (i) alone.
- Tapping the (i) shows the text again; tapping it again hides it.
- The footer's OpenStreetMap link is unchanged.

## Data and privacy

No change.

## Calculations

None.

## Tests

- e2e `attribution.spec.ts`: the info button sits inside the credit pill; the credit text is visible on load, hidden after five seconds of page clock, and shown again by the (i).
- No ARIA or visual baseline shows the credit; none changes.

## Docs

`docs/design.md` entry "Map credit — 27 October 2026"; `docs/lessons.md` entry for the stretched icon.
