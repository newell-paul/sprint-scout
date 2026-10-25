# Spec: simplify

## Behaviour

Unchanged, except that a forecast request now refuses redirects like the other two Open-Meteo requests, and the archive response's 200 kB cap is enforced on the streamed bytes.

## Data and privacy

No new requests. Every Open-Meteo request keeps `credentials: "omit"`, `referrerPolicy: "no-referrer"`, `cache: "no-store"` and gains or keeps `redirect: "error"`.

## Calculations

Unchanged. `routeEffect(route, hour, rider, retrievedAt?)` passes the same arguments `estimateRouteRideEffect` received before. `bestHourIndex` reads each hour's `at` for the availability window.

## Tests

- `packages/contracts/src/index.test.ts`: the removed schemas' tests go; `lineString` is tested directly.
- `apps/web/app/routes/attempt.test.ts`: hours carry `at` instead of a separate instants list.
- `packages/testing/src/open-meteo.test.ts`: the multi-location fixture assertions go with the fixture.
- All other tests unchanged.

## Docs

`docs/design.md` entry "Shared Open-Meteo request and fewer contracts — 25 October 2026".
