# Plan: start end-to-end tests alongside the other gates

## Files

- `.github/workflows/ci.yml`: `e2e.needs` becomes `playwright-image`.
- `packages/testing/src/harness.test.ts`: assert it.
- `docs/design.md`, `docs/test-strategy.md`.

## Order

1. Test, shown failing against the current workflow.
2. Workflow change.
3. Docs, then `pnpm verify`.

## Proof

- The harness test fails before the change and passes after.
- `pnpm verify` green.
- The pull request's Checks run shows the e2e shards starting before the static gates finish.
