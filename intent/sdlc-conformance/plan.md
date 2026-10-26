# Plan: SDLC conformance

## Files

- `docs/sdlc.md`: the drift fixes and progress line.
- `docs/test-strategy.md`: slowest five.
- `evals/README.md`: growth rule, lesson table, two tasks.
- `evals/fork-artifacts/{task.md,check.sh,naive.sh}`.
- `evals/test-can-fail/{task.md,check.sh,naive.sh}`.

## Order

1. Intent, spec and plan.
2. The two evals, proved with `pnpm evals --dry-run` and a correct solution for each; the paid run is the pull request's Evals workflow.
3. Doc fixes; intent status done.

## Proof

`pnpm evals --dry-run` shows 15 checks can fail; each new check passes on a hand-written correct solution; the paid Evals run on the pull request passes on Sonnet; `pnpm verify` green; the Evals workflow on the pull request.
