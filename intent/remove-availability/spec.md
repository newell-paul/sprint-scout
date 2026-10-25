# Spec: remove availability

## Behaviour

Unchanged. With dry daylight on and no eligible hour, the forecast panel says "No eligible forecast hour matches your filters. Clear the dry daylight filter." The best-hour explanation drops "within your availability".

## Data and privacy

No change.

## Calculations

`bestHourIndex(effects, hours, daylightDryOnly)` and `rankOpportunities(routes, forecasts, rider, daylightDryOnly)` lose their availability argument; results are the same for the `null` the app always passed.

## Tests

Availability tests in `attempt.test.ts` and `opportunities.test.ts` go. The board's filter-heading test checks the dry daylight wording alone. No ARIA baseline mentions availability.

## Docs

`docs/design.md`: the 14 September note points to the new entry "Availability code removed — 25 October 2026".
