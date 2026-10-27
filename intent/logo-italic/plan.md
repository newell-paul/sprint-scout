# Plan: high-velocity italic logo

## Files

- `apps/web/app/globals.css`: `.segment-logo` gains `transform: skewX(-12deg)`; `.logo-word-accent` weight 700 and `margin-left: 0.26em`.
- `packages/testing/src/dashboard.ts`: `.brand` gains the same skew; `.brand b` weight 700 and `margin-left: .26em`.
- `packages/testing/src/dashboard.test.ts`: assert the slant, weight and gap in the dashboard CSS.
- `docs/design.md`: dated entry.

## Order

1. Dashboard test first, shown failing, then the dashboard CSS.
2. Planner CSS; check desktop and 390 px on the dev server, and that the header does not wrap.
3. Docs, intent status `done`, `pnpm verify`.

## Proof

- `dashboard.test.ts` passes and fails without the change.
- `e2e/library.spec.ts` heading test passes unchanged; no ARIA baseline diff.
- Owner checks the planner and dashboard on the local dev server.
- `pnpm verify` green.
