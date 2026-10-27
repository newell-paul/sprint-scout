# Plan: map credit

## Files

- `e2e/attribution.spec.ts`: failing tests first; `e2e/pages/map.ts` gains the credit, its text and its (i) button.
- `apps/web/app/globals.css`: the attribution button keeps MapLibre's 24 px size and does not repeat its icon.
- `apps/web/app/routes/route-drawer.tsx`: once the map is ready, a five-second timer in its own effect shrinks the credit and is cleared on unmount. MapLibre already makes the credit compact at every width, so no control option changes.
- `docs/design.md`, `docs/lessons.md`.

## Order

Failing e2e committed, tests locked, CSS fix, collapse timer, docs.

## Proof

The new spec fails before and passes after; screenshots of the credit before and after at 1280 and 390 px; `pnpm verify` green; owner checks on the local dev server before the pull request.
