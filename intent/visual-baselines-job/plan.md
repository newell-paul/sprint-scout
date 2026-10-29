# Plan: visual baselines job

## Files

- `packages/testing/src/baselines.ts` and `baselines.test.ts`: the pure `baselineTree()`.
- `packages/testing/src/baselines.cli.ts`: reads `git status`, creates blobs, tree, commit and ref update through the API, prints the summary. `package.json`: a `baselines:commit` script.
- `.github/workflows/visual-baselines.yml`: guard, render and commit jobs.
- `.github/workflows/ci.yml`: the `workflow_dispatch` trigger and its comment.
- `AGENTS.md`, `docs/test-strategy.md`, `docs/sdlc.md`, `docs/design.md`.

## Order

1. Unit tests for `baselineTree()`, then the function.
2. The CLI and package script.
3. The workflow and the Checks trigger.
4. Docs; `pnpm check:static`, `pnpm test`; intent done.
5. After merge, the first run is on `target-below-shelter` (PR #94).

## Proof

- `pnpm test` covers `baselineTree()`.
- `pnpm check:static` and `pnpm check:intents` pass.
- After merge: the run on PR #94 commits new baselines, Checks runs on them, and the visual tests pass.
