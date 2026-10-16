# Line coverage that measures behaviour

Status: done
Opened: 16 October 2026 by the owner

## Problem

The dashboard reports 82 % line coverage while every core package is at or near 100 %. The gap is mostly code no unit test can reach: CLI entry points, Playwright and Vitest fixtures, the contract drift script and the API server start-up. One real module, `apps/web/app/routes/forecast-cache.ts`, has no tests at all.

## Proposed outcome

Coverage counts behaviour, not wiring. The forecast cache has unit tests that fail when its sharing, expiry, failure, force and timeout rules break. Entry points and test-only fixtures are excluded from the report, and the excluded list is documented.

## Affected users and parts

The owner and readers of the dashboard. `vitest.config.ts`, a new `forecast-cache.test.ts`, `docs/test-strategy.md`, `docs/design.md`.

## Constraints

No behaviour change in the app. Exclusions are limited to files that only start a process, run a fixture outside Vitest's unit project, or call a live service on import; any logic they hold is tested where it lives. Gates are not lowered.

## Open questions

1. Is `drift.ts` testable? Resolved: no; it calls Open-Meteo on import and exits, so it is an entry point like the CLIs.
2. Raise the global 80 % gate? Resolved: not here; a separate ratchet once the new figure has held for a few runs.
