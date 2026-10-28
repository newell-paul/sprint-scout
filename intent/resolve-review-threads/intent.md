# Resolve review threads when a finding is fixed

Status: accepted
Opened: 28 October 2026 by Paul Newell

## Problem

The dashboard's "Fixed after review" card reads 0 %, 0 of 6 reviewer threads resolved, although findings were fixed. On PR #87 the reviewer's "Clicking the active tab discards the draft" was fixed in `f409fad` and the pull request merged with the thread still open. The card counts GitHub's `isResolved`, and nothing resolves a thread: the `@claude` fix loop only replies, a fix made by hand leaves the thread as it was, and a clean re-review does not close earlier threads. The card can only move if the owner clicks Resolve.

## Proposed outcome

- When the `@claude` fix loop answers a review comment and pushes to the pull request's branch, that comment's thread is resolved.
- A finding fixed by hand is replied to and resolved with one command, `pnpm review:resolve`, and `AGENTS.md` says to use it.
- The card then counts what it says: threads resolved by the fix loop or by hand.

## Affected users and parts

`scripts/resolve-thread.mjs` (new), `package.json`, `.github/workflows/review.yml` (fix job), `packages/testing/src/resolve-thread.test.ts` (new), `harness.test.ts`, `AGENTS.md`, `REVIEW.md`, `docs/design.md`.

## Constraints

No new paid model calls. The resolve step is deterministic and uses the job token; the model gains no new tools. Nothing resolves a thread whose fix did not push.

## Out of scope

Resolving threads from a top-level `@claude` comment (it names no thread), and having a re-review close threads it no longer finds.

## Open questions

None.
