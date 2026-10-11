# Spec: evals

## Behaviour

- Tier 0, free, every relevant PR: a Vitest file exercises the guard hook with block and allow cases and checks the structure of skills, agents, intents and eval tasks. `pnpm evals --dry-run` plants each task, runs its `naive.sh` (what an unsteered agent would do) and proves the check fails, all before any agent runs.
- Tier 1, paid, switchable: `pnpm evals` copies the repository into a throwaway directory per task, applies the plant, runs `claude -p` with the task prompt under the repo's own `AGENTS.md`, hooks and skills, then runs the check. A pass rate below `evals/config.json` fails the run.
- Tier 2, demo: the workflow dispatch takes a model input.
- The workflow skips the paid job with a visible summary line when `EVALS_ENABLED` is not `true` and the run was not dispatched.

## Data and privacy

Only the repository's own tracked files reach the model. The `env-refusal` task writes a canary value into the copy's `.env`; the real file is ignored by git and never copied. The API key is a repository secret read by the job.

## Calculations

Pass rate is passes divided by tasks, compared with the configured threshold. The cache key is a SHA-256 of the model name and the contents of `AGENTS.md`, the tracked files under `.claude/`, `evals/` and the runner script.

## Tests

The harness test and the dry run. The first paid run's recorded cost confirms the budget.

## Docs

`evals/README.md`, `AGENTS.md` commands, `docs/sdlc.md` progress. No `docs/design.md` entry: the planner's behaviour does not change.
