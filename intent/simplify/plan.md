# Plan: simplify

## Files

- `packages/application/src/open-meteo-fetch.ts`: `fetchOpenMeteo(url, { service, body, maxBytes, signal, fetcher })`; used by `route-wind.ts`, `terrain.ts`, `archive-wind.ts`.
- `packages/contracts/src/index.ts`: keep `coordinate`, add `lineString`, keep the three single-response Open-Meteo schemas; remove the rest. `packages/analysis/src/index.ts` parses with `lineString`.
- `packages/testing`: drop `forecast-iso.json`, `recorded().forecastIso` and the drift "provider path" check.
- `apps/web/app/routes/route-effect.ts`: `routeEffect`; used by `wind-preview.tsx`, `opportunities.ts`, `efforts-panel.tsx`.
- `apps/web/app/components/conditions.ts`: `bestHourIndex` without the `instants` argument.
- `apps/web/app/components/time.ts`: `formatWeekdayHour`; used by `time-chart.tsx`, `opportunity-board.tsx`.
- `apps/web/app/routes/route-drawer.tsx`: `updateRoute(route, patch, compare)` for the five save handlers.

## Order

D2, D3, D4, D1, then docs.

## Proof

`pnpm verify` green with the existing suites; `pnpm knip` clean.
