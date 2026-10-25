# Plan: Stale intent check

From [spec.md](spec.md).

## Files

- `packages/testing/src/intents.ts`: `staleIntents`, pure.
- `packages/testing/src/intents.test.ts`: tests first.
- `packages/testing/src/intents.cli.ts`: reads `intent/`, prints, sets the exit code.
- `packages/testing/src/dashboard.ts`: export `intentStatus` so both read the status the same way.
- `package.json`: `check:intents`.
- `.github/workflows/ci.yml`: a step in Static gates.
- `packages/testing/src/harness.test.ts`: the step is there.
- `docs/design.md`: a dated entry.

## Order

1. The tests fail.
2. `intents.ts` and the CLI; the tests pass.
3. The script, the workflow step and the harness test.
4. Docs, then this intent set to done.

## Proof

- The new tests fail first, then pass.
- `pnpm check:intents` exits 0 on this branch once the intent is done, and exits 1 naming the intent while it is still `accepted` with this plan.
- `pnpm verify` is green.
