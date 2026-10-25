# Dashboard visuals: plan

## Files

- `packages/testing/src/dashboard.ts`:
  - Styles, the `ring`, `meter` and `columns` helpers, and `sparkline` options.
  - Card markup (head row with a ring), board markup, section order, and the slowest section. `bars` is removed.
- `packages/testing/src/dashboard.test.ts`: updated and new cases (see spec).
- `docs/design.md`: new entry and the five-card wording.
- `intent/dashboard-visuals/`: intent, spec, plan.

## Order

1. Mock-up rendered from the generator with sample history; owner review (done 25 October 2026, with the slowest table moved to the end).
2. Tests updated to the new markup, plus helper tests.
3. Docs.
4. `pnpm verify`, then a pull request.

## Proof

- `pnpm exec vitest run packages/testing/src/dashboard.test.ts`.
- `pnpm verify` green.
- The dashboard job on `main` renders the page after merge.
