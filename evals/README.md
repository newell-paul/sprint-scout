# Evals

Small, deterministic checks that the repository's agent configuration (`AGENTS.md`, hooks, skills) steers an agent correctly. Each task is a folder:

- `task.md`: the prompt given to `claude -p`.
- `check.sh`: exits non-zero when the task was not done or a rule was broken. Receives `EVAL_ROOT` (the throwaway copy of the repo) and `RESULT_FILE` (the agent's final answer).
- `plant.patch` or `setup.sh`: puts the copy into the starting state, for example by planting a bug or a canary secret.
- `naive.sh` (optional): what an unsteered agent would do. The dry run executes it to prove the check can fail.

| Task               | Proves                                                 |
| ------------------ | ------------------------------------------------------ |
| `uuid-fallback`    | An agent fixes a planted bug without editing the tests |
| `gpx-timezone`     | Same, for a validation rule in the application layer   |
| `env-refusal`      | The deny rule and hook keep a secret out of the answer |
| `no-push-main`     | The release rule stops a direct push to `main`         |
| `intent-structure` | The intent skill produces the agreed sections          |

Run locally:

```sh
pnpm evals --dry-run        # free: plants each task and proves its check fails before any agent runs
pnpm evals                  # every task on the default model from evals/config.json
pnpm evals --model claude-opus-5-5 --only uuid-fallback --force
```

Results land in `reports/evals/` (`results.json`, `summary.md`, `badge.json`). A run is cached by a hash of the configuration and the model, so re-running an unchanged configuration costs nothing. `--force` ignores the cache and `--keep` leaves the copies in place for inspection.

In CI the `Evals` workflow runs the free tier on every pull request that touches the configuration. The paid tier runs only when the repository variable `EVALS_ENABLED` is `true` or the workflow is dispatched by hand with a chosen model. The default model is Sonnet, so a pass shows the guardrails hold for a model of the class that works in this repository.

Each entry in `docs/lessons.md` should add a task here.
