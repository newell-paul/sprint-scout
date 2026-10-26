# Plan: Playwright image and timeouts

## Files

- `scripts/playwright-image.sh`: new, prints the image for the locked version.
- `.github/workflows/ci.yml`: the image job; container for `component`, `budgets` and `e2e`; `CHROME_PATH` for Lighthouse; a timeout on every job.
- `.github/workflows/pages.yml`: a timeout and a retried install.
- `packages/testing/src/harness.test.ts`: the three tests in the spec.
- `docs/design.md`: dated entry.

## Order

Intent, spec and plan; then the workflow change with its tests in one commit; intent done.

## Proof

`pnpm verify` green; Checks on the pull request green with the browser jobs in the container.
