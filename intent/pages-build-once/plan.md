# Plan: Pages deploys the export that passed Checks

## Files

- `.github/workflows/ci.yml`: upload `site` from the `budgets` job on a push to main.
- `.github/workflows/pages.yml`: download `site` in place of the build, Chromium install and gates; Node and pnpm only for the manual intent-board refresh; build timeout 10.
- `packages/testing/src/harness.test.ts`: the two new assertions.
- `docs/test-strategy.md`, `docs/design.md`.

## Order

1. Harness tests first, failing against the current workflows.
2. Workflow changes until they pass.
3. Docs.

## Proof

- The new harness tests fail before the workflow change and pass after.
- `pnpm verify` green.
- After merge: the Pages run on main succeeds without a Chromium step and the live site serves the merge commit's build.
