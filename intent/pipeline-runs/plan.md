# Recent runs strip: plan

## Files

- `packages/testing/src/dashboard.ts`:
  - the empty-conclusion filter;
  - the `RecentRun` type;
  - `recent` in `pipelineSummary`;
  - `appendHistory` trimming;
  - `runsCard` and its CSS.
- `packages/testing/src/dashboard.test.ts`.
- `.github/workflows/ci.yml`: `--limit 31`.
- `docs/lessons.md`, `docs/design.md`.

## Order

1. Failing test for the in-progress run, then the fix (bugfix skill).
2. `recent`, history trimming and the card, with tests.
3. A mock-up rendered from the real run list, for the owner.
4. Docs, then `pnpm verify` and a pull request.

## Proof

- `pnpm exec vitest run packages/testing/src/dashboard.test.ts`.
- `pnpm verify` green.
- The deployed dashboard shows the strip after merge.
