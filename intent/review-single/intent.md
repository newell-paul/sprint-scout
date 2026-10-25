# One review per pull request

Status: in build
Opened: 25 October 2026 by Paul Newell

## Problem

The review workflow posts each finding twice: once as an inline comment and again in a summary comment. GitHub mails each post separately, so the owner gets two or more emails about the same Minor, in two different layouts. Each inline comment is its own review, so three findings mean four emails.

## Proposed outcome

- Each reviewed push produces one GitHub review: the summary is its body and each Blocker, Major and Minor finding is a comment on its line. One email.
- The reviewing agent no longer posts anything; it returns the review as structured output and a workflow step posts it.

## Affected users and parts

`.github/workflows/review.yml`, `packages/testing/src/review.ts`, `review.cli.ts`, `review.test.ts`, `REVIEW.md`.

## Constraints

No new secrets. The agent loses its write tools; only the posting step holds `pull-requests: write` through the job token. The review never approves or requests changes. The dashboard's thread counts keep working (`scripts/collect-reviews.mjs` already counts `github-actions[bot]`).

## Open questions

None.
