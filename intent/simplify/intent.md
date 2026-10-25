# Simplify: shared helpers and unused contracts

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

The whole-repository review on 25 October 2026 found repeated code and dead schemas:

- **D1:** five save handlers in `route-drawer.tsx` repeat the same read, compare and patch.
- **D2:** the forecast, elevation and archive loaders each repeat the Open-Meteo request and body read, with small drift: the forecast allowed redirects, and the archive read the whole body before checking its size. The `provenance`, `sourcePolicy`, `attribution`, `sourceKind`, `utcInstant` and `segment` schemas, and the multi-location forecast schema with its fixture and drift check, are left from the removed provider path; only tests use them.
- **D3:** three places build the ride effect for a saved segment with the same terrain and shelter arguments, and `bestHourIndex` takes a separate list of instants the hours already carry.
- **D4:** two components define the same weekday-and-hour label.

## Proposed outcome

One helper for each repeated piece, no schemas without a runtime user, and no change in behaviour apart from the forecast refusing redirects and the archive enforcing its size cap while it streams.

## Affected users and parts

`apps/web/app/routes/route-drawer.tsx`, `route-effect.ts` (new), `wind-preview.tsx`, `opportunities.ts`, `efforts-panel.tsx`, `opportunity-board.tsx`, `apps/web/app/components/conditions.ts`, `time.ts`, `time-chart.tsx`; `packages/application/src/open-meteo-fetch.ts` (new), `route-wind.ts`, `terrain.ts`, `archive-wind.ts`; `packages/contracts`; `packages/analysis/src/index.ts`; `packages/testing` (drift, recorded fixtures); `docs/design.md`.

## Constraints

No behaviour change visible to the rider; existing tests pass unchanged except where they call a removed export or argument.

## Out of scope

The availability window plumbing (`availability={null}` everywhere) stays; removing it is the owner's call (`docs/design.md`).

## Open questions

None.
