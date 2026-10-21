# Paid CI steps on the owner's subscription

Status: in build
Opened: 21 October 2026 by Paul Newell

## Problem

Review, triage, the fix loop and the paid evals read `ANTHROPIC_API_KEY`. The first review with the key (PR #14) failed in 0.2 s without reaching the model, so the paid steps have never run. The owner has a Claude subscription and a `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`.

## Proposed outcome

Every paid step authenticates with `CLAUDE_CODE_OAUTH_TOKEN` and bills the owner's subscription. No workflow reads `ANTHROPIC_API_KEY`.

## Affected users and parts

`.github/workflows/review.yml` (review and fix loop), `triage.yml`, `evals.yml`; `docs/sdlc.md`, `docs/design.md`.

## Constraints

Secrets never reach fork pull requests (unchanged). Subscription runs share the owner's usage limits. The token expires about a year after it was made.

## Open questions

None.
