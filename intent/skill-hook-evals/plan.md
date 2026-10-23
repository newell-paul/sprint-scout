# Plan: Skill and hook evals

From [spec.md](spec.md).

## Files

- `packages/testing/src/harness.test.ts`: guard Bash cases for both markers; transcript parser cases.
- `.claude/hooks/guard.mjs`: the deny-by-default Bash rule for protected paths.
- `scripts/eval-skills.mjs`: new; prints the skills loaded in a stream-JSON transcript.
- `scripts/run-evals.mjs`: stream-JSON output, the final result line, `TRANSCRIPT_FILE` for `naive.sh` and `check.sh`, the transcript kept outside the copy, `eval-skills.mjs` in the configuration hash.
- `evals/config.json`: `Skill` in `allowedTools`.
- `evals/skill-intent/`, `skill-intent-quiet/`, `skill-bugfix/`, `skill-bugfix-quiet/`, `skill-release/`, `skill-release-quiet/`, `hook-fixing/`, `hook-baseline/`: `task.md`, `check.sh`, `naive.sh`, and `setup.sh` or `plant.patch` where a starting state is needed.
- `.github/workflows/evals.yml`: `scripts/eval-skills.mjs` in the path filter and the cache key.
- `evals/README.md`, `docs/sdlc.md`, `docs/design.md`: as in the spec.

## Order

1. Guard tests first: add the Bash cases to `harness.test.ts` and confirm the blocked ones fail against the current guard.
2. Extend `guard.mjs` until the guard tests pass, without weakening the existing cases.
3. Parser tests, then `scripts/eval-skills.mjs`.
4. Runner: stream-JSON, transcript path and environment, hash input; `Skill` in the config allowlist; the workflow path filter and cache key.
5. The eight task folders. `pnpm evals --dry-run` must report 13/13 checks can fail.
6. One paid run of the new tasks on Sonnet (`pnpm evals --only <the eight>`). Then adjust any task whose prompt proves ambiguous rather than any check, and record the result.
7. Docs, intent status `done`.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/harness.test.ts`: the new guard and parser cases pass, and the blocked cases failed before step 2.
- `pnpm evals --dry-run`: 13/13 checks can fail.
- `pnpm evals --only skill-intent,skill-intent-quiet,skill-bugfix,skill-bugfix-quiet,skill-release,skill-release-quiet,hook-fixing,hook-baseline --model claude-sonnet-5-5`: results quoted in the pull request.
- `pnpm verify` green, through the verifier agent.
