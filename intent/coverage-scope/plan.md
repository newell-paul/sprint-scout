# Plan: coverage scope

## Files

- `apps/web/app/routes/forecast-cache.test.ts`: new.
- `vitest.config.ts`: five exclusions in `coverage.exclude`.
- `docs/test-strategy.md`: the exclusions under the coverage gates.
- `docs/design.md`: dated entry.
- `.cspell/project-words.txt`: `unstub`, from `vi.unstubAllGlobals`.

## Order

Tests first, proved against mutations of `forecast-cache.ts`; then the exclusions; then docs.

## Proof

- `pnpm exec vitest run --project unit apps/web/app/routes/forecast-cache.test.ts` green, and red under each mutation.
- `pnpm test:coverage` reports forecast-cache at 100 % and total lines above 90 %.
- `pnpm verify` green.
