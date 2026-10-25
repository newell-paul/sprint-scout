# Saved data: timestamps, effort times, rider storage, GPX import, wind

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

The whole-repository review on 25 October 2026 found five gaps in how the planner reads and writes saved data, plus stale comments:

- **B1:** effort timestamps are accepted in any form `Date.parse` takes. Efforts are sorted and de-duplicated by string, so `2026-09-12T10:00:30+01:00` and `2026-09-12T09:00:30.000Z` count as two efforts and sort wrongly. A time with no zone is read in the device's zone.
- **B2:** effort matching rounds the elapsed time to 0.1 s, so a crossing under 0.05 s saves `0`. The library rejects `elapsedSeconds: 0`, so the next load reports every saved segment as unreadable.
- **B3:** when the browser cannot store rider numbers, nothing says so; the note still says "Stored in this browser only".
- **B4:** a GPX import drops points without a usable time and says nothing, so a short or empty result has no explanation.
- **B5:** saved past wind with a speed but no direction is accepted, although the archive loader never writes one and the ride effect cannot use it.
- **B6:** comments that no longer match the code: `ride-effect.ts` says shelter is not modelled, `route-wind.ts` says reference rider, `weather-icon.tsx` mentions a dark theme, and the forecast refresh in `wind-preview.tsx` says what, not why.

## Proposed outcome

- Saved effort times must carry a zone and are read back as UTC instants (`toISOString` form), so sorting and duplicate checks work on any valid input.
- A matched effort is never shorter than 0.1 s.
- If rider numbers cannot be stored, the rider note says they apply until the page is closed.
- A GPX import that skipped points says how many, and how many had no time zone.
- Saved wind with a speed above zero needs a direction.
- The listed comments describe the current code.

## Affected users and parts

`apps/web/app/routes/library.ts`, `rider-settings.tsx`, `route-drawer.tsx`, `wind-preview.tsx`, `efforts-panel.tsx`, `packages/analysis/src/effort-match.ts`, `packages/application/src/gpx.ts`, comments in `ride-effect.ts`, `route-wind.ts`, `weather-icon.tsx`; their tests.

## Constraints

No new network requests. Existing saved data written by the app still loads. Analysis stays pure with 100 % coverage.

## Out of scope

The `contracts` comment about providers moves to the simplify work, which removes the provider schemas it describes.

## Open questions

None.
