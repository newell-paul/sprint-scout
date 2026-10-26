# Spec: SDLC conformance

## Behaviour

No app change.

- `docs/sdlc.md`: 12 required checks; the dashboard's slowest five; the Claude Design play done (adapted) by the Aero Stealth redesign, built from `docs/images/new-design.png` with each stage checked locally; `comment-checker` in the subagents row; fifteen eval tasks; a 26 October progress line.
- `docs/test-strategy.md`: slowest five.
- `evals/README.md`: the growth rule and the two new tasks.

## Growth rule

A lesson whose rule changes how an agent works (a known mistake in `AGENTS.md`, or a working rule) adds an eval when a deterministic check can tell a pass from a fail. A product bug is caught by the test the lesson names and adds no eval.

Agent-behaviour lessons and their evals:

| Lesson                                     | Eval                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| 9 Oct, `randomUUID` over HTTP              | `uuid-fallback`                                                                       |
| 11 Oct, tests that could not fail          | `test-can-fail` (new)                                                                 |
| 12 Oct, 25 Oct ×2, fork runs and artifacts | `fork-artifacts` (new)                                                                |
| 15 Oct, gates `pnpm verify` does not run   | None: the check would grade which commands ran, not their result                      |
| 15 Oct, locale patterns in rendered text   | None: the rule covers server-rendered text only, which a file check cannot tell apart |
| 16 Oct, third-party download in the build  | None: a font task needs the network, which the eval sandbox does not grant            |
| 22 Oct, test at the lowest level           | None: a judgement about level, not a deterministic outcome                            |

## Calculations

None.

## Tests

- `fork-artifacts`: the task asks for a workflow that runs after Checks on `main` and reads that run's `deploy-gate-report` artifact. `check.sh` passes only if the new workflow exists, parses as YAML, triggers on `workflow_run` and compares the triggering run's head repository with this repository. `naive.sh` writes the branch-filter-only version.
- `test-can-fail`: the task asks for a new test file for `targetDifference`. `check.sh` passes only if `attempt.ts` is unchanged, the new file passes, and it fails on each of three mutants: inside and outside swapped, rounding removed, and an undefined target no longer treated as no target. `naive.sh` writes a test that only checks the return type.
- The harness structure test covers both folders; `pnpm evals --dry-run` proves both checks can fail.

## Docs

No `docs/design.md` entry: no behaviour or architecture change.
