# Plan: CI and dashboard hardening

From [spec.md](spec.md).

## Files

- `packages/testing/src/harness.test.ts`, `dashboard.test.ts`: tests first.
- `.claude/hooks/guard.mjs`: the push pattern and the env messages.
- `.github/workflows/ci.yml`: the dashboard job's history, API reads, upload and failure steps; the e2e comment.
- `.github/workflows/pages.yml`: the manual path, the checkout ref, the download.
- `scripts/collect-reviews.mjs`, `scripts/collect-intents.mjs`: failure handling and the repository filter.
- `packages/testing/src/dashboard.ts`: the mutation badge, the sparkline label, the header comment.
- `packages/testing/src/dashboard.cli.ts`, `bands.ts`, `bands.yaml`, `drift.ts`: wording.
- `docs/design.md`, `docs/lessons.md`.

## Order

1. The tests fail.
2. Guard, workflows, collectors, dashboard; the tests pass.
3. Wording and docs; this intent set to done.

## Proof

- The new tests fail first, then pass.
- `pnpm verify` is green.
- After merge, the next dashboard build on main logs "(2 days)" or more once a second day exists, and no fork run can be selected by the artifact query.
