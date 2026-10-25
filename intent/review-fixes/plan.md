# Plan: review fixes

From [spec.md](spec.md). Each fix is test-first: the failing test, then the change.

## Files

- `packages/analysis/src/effort-match.ts` and test: enforce `trackLimits.gapSeconds` at entry and inside the effort.
- `packages/testing/src/open-meteo.ts`, `handlers.ts`: `slow` and `timeout` archive faults.
- `apps/web/app/routes/efforts-panel.tsx` and new browser test: a `latest` ref for the stored efforts; a `timedOut` flag.
- `apps/web/app/routes/opportunity-board.tsx` and test: targets keyed by content; a `forceNext` ref set by Refresh and expiry.
- `apps/web/app/routes/route-drawer.tsx`, `wind-preview.tsx` and test: `{ at, seq }` request with a `requestSeq` prop.
- `docs/design.md`.

## Order

F4, F3 with F10, F9, F7; then docs and `pnpm verify`.

## Proof

- Each new test failed for the reported reason before its fix.
- `pnpm test:coverage` keeps the analysis package at 100 %.
- `pnpm verify` green; Checks green on the pull request.
