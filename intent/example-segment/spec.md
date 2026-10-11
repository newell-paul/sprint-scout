# Spec: example segment on first visit

## Behaviour

- When the library key is absent from local storage, the planner writes one route named "Richmond Park (example)" into the first slot and selects it. The forecast loads as for any confirmed route.
- Delete from Manage removes it like any other route. After deletion the library is `[]`; reloading does not reseed.
- Redraw, terrain, shelter, target and efforts behave as for a drawn route.
- Mobile layout is unchanged.

## Data and privacy

- Geometry: 18 points, 593 m, routed on OpenStreetMap roads between the owner's start and finish near Roehampton Gate, Richmond Park. ODbL, attributed already by the map.
- The first-visit forecast request sends the example's start coordinate to Open-Meteo. It is a constant in the repository, so it discloses nothing about the user. The source confirmation on saving continues to guard user-drawn locations.

## Calculations

None new. The example is an ordinary `DrawnRoute`.

## Tests

- Unit: points valid and west-bound from Roehampton Gate; round-trip through `readLibrary`; seeding happens only when the key is absent and never when it is `[]`.
- e2e: a `firstVisit` opt-in fixture; one scenario loads, reloads, deletes, reloads and confirms the slot stays empty. All other specs start from `[]` through an auto fixture.

## Docs

`docs/design.md` entry "Example segment on first visit — 9 October 2026". README "Try it" sentence.
