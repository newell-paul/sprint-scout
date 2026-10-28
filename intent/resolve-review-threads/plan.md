# Plan: resolve review threads

From [spec.md](spec.md).

## Files

- `packages/testing/src/resolve-thread.test.ts`: new, stub `gh` as in `collect-reviews.test.ts`.
- `scripts/resolve-thread.mjs`: new.
- `package.json`: `review:resolve`.
- `packages/testing/src/harness.test.ts` and `.github/workflows/review.yml`: head before and after the action, then the resolve step.
- `AGENTS.md`, `REVIEW.md`, `docs/design.md`.

## Order

Failing tests, then the script and the workflow steps, then docs and `pnpm verify`.

## Proof

- The new tests fail before the script and the workflow change exist.
- `pnpm verify` green; Checks green on the pull request.
- After merge, PR #87's open "Restore into a filled slot" thread still reads unresolved (no Dismiss test yet), and the "active tab" thread, resolved by hand with the GraphQL mutation the script uses, reads resolved.
