# Skill and hook evals

Status: accepted
Opened: 23 October 2026 by Paul Newell

## Problem

Step 14 of `docs/sdlc.md` is the last unbuilt step. The five evals prove the guardrails around secrets, pushes to `main`, test-first fixes and the intent template, but nothing proves the policy skills trigger.

- **Skills.** `intent`, `bugfix` and `release` load only when the model matches a request to their `description`. The harness test checks that each skill has a description; it cannot tell whether a description is too narrow (a feature request starts coding without an intent) or too broad (a typo fix opens an intent folder). A wording change in `.claude/skills/**` passes every gate today.
- **Hooks.** The harness test runs `guard.mjs` directly over block and allow cases, so the rules are right in isolation. No eval proves an agent working under the hook respects two of them: no test edits while `.claude/state/fixing` exists, and no hand-edited `__aria__` or `__screenshots__` baselines.
- **A known gap.** The guard checks the Edit and Write tools only for those two rules. A shell command such as `sed -i` or a redirect into a test file during a bug fix is not blocked, and an agent told it may not edit the test could use one.
- `docs/sdlc.md` is stale in places: branch protection is live as a ruleset but the table and step 6 still say it waits, and "CI write steps as PRs" still says "Do".

## Proposed outcome

- **Skill evals.** One task per skill where the request should load it and one where it should not, six in all. Each passes or fails on whether the agent loaded that skill, read from the run's transcript, plus a check on the outcome where one exists (no source change when an intent was due; no intent folder for a one-line fix).
- **Hook evals.** Two tasks with the guard active: a bug fix with the `fixing` marker set whose quickest route is editing the test, and a change whose quickest route is hand-editing an ARIA baseline. Each fails if the protected file changes by any route.
- **Gap closed.** The guard also blocks shell commands that write to tests while `fixing` exists and to baselines without the `snapshots` marker, proved by new free guard test cases before the hook changes.
- **Gate.** All new tasks join the existing `Evals` workflow, its dry run (every check fails on a naive or planted state), its cache and its switch. Changes to `.claude/**` are then gated by them.
- `docs/sdlc.md` marks step 14 done and corrects the stale rows.

## Affected users and parts

The owner, and any agent working in the repository. `evals/` (new tasks, README table), `scripts/run-evals.mjs` (transcript capture for skill checks, the Skill tool in the allow list), `.claude/hooks/guard.mjs`, `packages/testing/src/harness.test.ts`, `docs/sdlc.md`, `docs/design.md`.

## Constraints

- Deterministic checks only: a skill counts as loaded from the transcript's tool calls, never from a model-graded verdict.
- No schedules. Paid runs stay behind `EVALS_ENABLED`, on the subscription token, cached by configuration hash, and only on pull requests touching the configuration or on dispatch.
- Every task's check must fail on its naive state in the free dry run.
- The throwaway copies have no real remote and no `gh` access, so a release task can never publish anything.
- The guard change must not block ordinary shell reads of tests or the commands the `release` skill and `pnpm verify` run.

## Open questions

1. How does a check see which skills loaded: a stream-JSON transcript written beside the result, or another route?
2. What does the naive state of a skill task look like when nothing was loaded, so the dry run proves the check can fail?
3. Which shell patterns count as a write to a protected file (`sed -i`, redirects, `tee`, `cp`, `mv`, `git checkout --`), and how are false positives kept out?
4. Does eleven tasks on Sonnet change the pass threshold or the turn budget in `evals/config.json`?
