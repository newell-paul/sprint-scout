# Plan: evals

## Files

- `evals/config.json`, `evals/README.md`, five task folders with `task.md`, `check.sh` and a `plant.patch`, `setup.sh` or `naive.sh`.
- `scripts/run-evals.mjs`: copy, plant, run, check, cache, summary, badge.
- `packages/testing/src/harness.test.ts`: hook cases and structure checks.
- `.github/workflows/evals.yml`: harness job always, paid job behind the switch or dispatch.
- `package.json` (`evals` script), `AGENTS.md`, `docs/sdlc.md`, `.cspell/project-words.txt`.

## Order

1. Plant patches from the current code, then tasks and checks.
2. Runner with dry run.
3. Harness test.
4. Workflow, docs.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/harness.test.ts` green.
- `pnpm evals --dry-run` reports every task's check failing on the naive or planted state.
- `pnpm verify` green.
- First paid run: cost per task recorded in `reports/evals/results.json`.
