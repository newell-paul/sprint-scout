# Plan: map credit

## Files

- `e2e/attribution.spec.ts`: failing tests first.
- `apps/web/app/globals.css`: the attribution button keeps MapLibre's 24 px size and does not repeat its icon.
- `apps/web/app/routes/route-drawer.tsx`: `attributionControl: { compact: true }`; after the street source is added, a five-second timer shrinks the credit, cleared on unmount.
- `docs/design.md`, `docs/lessons.md`.

## Order

Failing e2e committed, tests locked, CSS fix, collapse timer, docs.

## Proof

The new spec fails before and passes after; screenshots of the credit before and after at 1280 and 390 px; `pnpm verify` green; owner checks on the local dev server before the pull request.
