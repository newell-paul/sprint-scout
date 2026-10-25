# Plan: remove availability

## Files

- `apps/web/app/routes/attempt.ts`: remove `Availability`, `validAvailability`, `withinAvailability`.
- `apps/web/app/components/conditions.ts`: `bestHourIndex` without availability.
- `apps/web/app/routes/opportunities.ts`, `opportunity-board.tsx`, `wind-preview.tsx`, `route-drawer.tsx`: remove the prop, argument and wording.
- Tests: `attempt.test.ts`, `opportunities.test.ts`, `opportunity-board.browser.test.tsx`, `wind-preview.browser.test.tsx`.
- `docs/design.md`.

## Order

Code and tests together, then docs.

## Proof

`pnpm verify` green; `git grep -i availability -- apps` finds nothing.
