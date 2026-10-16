# Spec: coverage scope

## Behaviour

No change in the app. The coverage report leaves out:

- `**/*.cli.ts`: argument parsing and file I/O around tested modules.
- `packages/testing/src/playwright.ts`: the Open-Meteo stub fixture for e2e; it runs inside Playwright.
- `packages/testing/src/vitest-commands.ts`: a browser-mode command that runs in the Vitest Node process for component tests.
- `packages/testing/src/drift.ts`: the advisory contract drift script; it fetches Open-Meteo on import.
- `apps/api/src/server.ts`: listens on a port and wires signals; `createApp` is tested.

## Data and privacy

None. Tests stub `loadRouteWind`; no request leaves the process.

## Calculations

None.

## Tests

`apps/web/app/routes/forecast-cache.test.ts`, with `loadRouteWind` mocked:

- concurrent calls for points equal to four decimal places share one request;
- `peekRouteForecast` is null before settling, returns the forecast while fresh and null once expired;
- an expired cached forecast is fetched again;
- `force` bypasses the cache;
- a failed request is not cached;
- the save-time confirmation is passed as both source confirmation and weather consent;
- the request is aborted after `timeoutMs`.

Each is checked against a mutation of the module before it is trusted.

## Docs

`docs/test-strategy.md` lists the exclusions beside the coverage gates. Dated entry in `docs/design.md`.
