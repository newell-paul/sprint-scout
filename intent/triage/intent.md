# Failed-run triage

Status: done
Opened: 10 October 2026 by the owner

## Problem

When Checks fails on a pull request, the author opens the run, finds the red job, scrolls a long log and works out which step failed and why. Most failures are one of a few kinds (a stale snapshot, a lint rule, a flaky network step, a type error) and the diagnosis is the same every time. The repository is a showcase, so this read-only judgement step should run itself and leave a visible, cheap trace.

## Proposed outcome

When a Checks run on a pull request ends in failure, a comment appears on the pull request within a few minutes with three lines: which job and step failed, the probable cause in one sentence, and the next thing to do. The comment is updated, not repeated, on later failures. The step reads logs only, never runs pull request code, and costs cents.

## Affected users and parts

Pull request authors and reviewers. New `Triage` workflow, `packages/testing/src/triage.ts` and its CLI, `docs/sdlc.md`, `docs/design.md`, the harness test.

## Constraints

No scheduled workflows. Paid per failed run, so behind a repository variable. `workflow_run` carries the secret even for fork pull requests, so the job checks out the default branch only and gives the model read-only tools; log text is data, not instructions. Nothing committed until the owner says.

## Open questions

1. Where does the diagnosis go for a failure on `main`? Resolved: nowhere yet; `main` failures are the band breach path of step 13. Triage covers pull requests only.
2. Which model? Resolved: Sonnet by default, a variable overrides.
3. What if the model answers in the wrong shape? Resolved: a deterministic fallback comment names the failed step and links the run, and the triage job fails visibly.
