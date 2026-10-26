# Spec: push e2e checks down

## Behaviour

No product behaviour changes. Each e2e test below is deleted, after its replacement passes where one is listed.

### Delete: already covered

| e2e test                                                      | Covered by                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| forecast.spec.ts: previous hour is disabled at the first hour | wind-preview, navigation                                                            |
| terrain.spec.ts: heights follow the unit                      | terrain-panel                                                                       |
| terrain.spec.ts: remove returns to flat-road mode             | terrain-panel                                                                       |
| terrain.spec.ts: automatic reload unavailable before consent  | terrain-panel, empty state                                                          |
| attempt.spec.ts: target "1:60" refused                        | target-settings                                                                     |
| board.spec.ts: a failed forecast stays unranked               | opportunity-board, error state (add the Open button disabled check there if absent) |
| efforts.spec.ts: an effort can be removed                     | efforts-panel                                                                       |
| shelter.spec.ts: the board carries the shelter assumption     | opportunity-board, ranked state                                                     |

### Move to `wind-preview.browser.test.tsx` (17)

- faults.spec.ts: forecast times out; try again after a timeout; rate limit says so and offers retry; empty body is unusable
- forecast.spec.ts: hour without wind reads unavailable; previous hour steps back; best hour picks today's best window; particles off; particles back on; hourly table selects an hour
- attempt.spec.ts: wind, gusts and precipitation; a no-data hour reads unavailable; target editable during an outage; mph converts conditions
- rider.spec.ts: night and wet bands; hourly table names rain and night
- shelter.spec.ts: starts exposed

### Move elsewhere (15)

| e2e test                                                                                                                                                                                                                | New home                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| forecast.spec.ts: calm hour equals still-air time                                                                                                                                                                       | ride-cockpit               |
| efforts.spec.ts: same ride twice, no duplicate; opposite direction matches nothing; no track points rejected; import disabled until confirmed; confirming enables import; past wind loads after consent; archive outage | efforts-panel (7)          |
| terrain.spec.ts: incomplete elevation reported; remove switches automatic reload off                                                                                                                                    | terrain-panel (2)          |
| terrain.spec.ts: board ranks with the terrain model                                                                                                                                                                     | opportunity-board          |
| rider.spec.ts: out-of-range CdA refused; reference rider restores pace                                                                                                                                                  | rider-settings (2)         |
| privacy.spec.ts: backing out keeps everything                                                                                                                                                                           | clear-data                 |
| rider.spec.ts: best hour can fall in rain                                                                                                                                                                               | unit, `conditions.test.ts` |

Every e2e test not listed stays.

## Data and privacy

No change. Component tests use the shared msw worker and recorded fixtures; the no-internet guard stays.

## Calculations

None.

## Tests

Each new test asserts the behaviour its e2e test asserted, at component or unit level, and is shown to fail when that behaviour is broken (a temporary edit to the component, reverted). New ARIA snapshots, if any, are generated by the runner. Page-object members left unused by the deletions are removed.

## Docs

`docs/test-strategy.md`: the component and e2e counts and the push-down. No `docs/design.md` entry: test layout only.
