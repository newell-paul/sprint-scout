# Pull request review and fix loop

Status: done
Opened: 10 October 2026 by the owner

## Problem

`REVIEW.md` states the review policy but nothing applies it. Every pull request is reviewed by whoever reads it, with whatever attention they have that day, and the findings leave no trace that the dashboard can show. The repository is a showcase of AI-native practice, so the review should be automated, policy-driven, visible and cheap enough to leave on.

## Proposed outcome

Every non-draft pull request from this repository receives a review written against `REVIEW.md`: inline comments on the lines concerned, one summary comment grouped by severity, a tally in the job summary. The review never approves, requests changes or blocks; branch protection and a person decide. A comment containing `@claude` on a pull request starts a fix loop that pushes to that pull request's branch only. The dashboard shows findings by severity over recent pull requests and the share of review threads resolved.

## Affected users and parts

The owner and contributors. New `Review` workflow, `packages/testing/src/review.ts` and its CLI, `scripts/collect-reviews.mjs`, the dashboard's AI practice section, the Checks dashboard job, `REVIEW.md`, `docs/sdlc.md`, `docs/design.md`.

## Constraints

No scheduled workflows. Paid per pull request, so behind a repository variable like the evals, with draft, bot and fork pull requests skipped. Secrets never reach a fork. The fix loop pushes only to the pull request branch; the guard hook still applies inside the action. Nothing committed until the owner says.

## Open questions

1. Which model reviews? Resolved in the spec: Sonnet by default, a variable overrides.
2. How does the tally reach the dashboard without trusting free text? Resolved: the action's structured output.
3. What counts as "resolved by the fix loop"? Resolved: review threads opened by the reviewer and marked resolved, by the loop or by hand.
