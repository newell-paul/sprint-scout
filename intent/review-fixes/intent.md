# Review fixes: efforts, board fetching, reopening an opportunity

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

A Codex review of the application (`docs/reviews/2026-10-25-typescript-review.md`), challenged finding by finding by a second reviewer, left five defects worth fixing now:

- **F4:** effort matching ignores recording gaps. `trackLimits.gapSeconds` (60 s) is declared and never enforced, so a ride that pauses for an hour across the segment yields an effort timed by interpolating across the pause.
- **F3:** "Load past wind" writes back the efforts captured before the request, so an effort removed while it ran comes back.
- **F10:** the 20 s past-wind timeout aborts silently: the button re-enables and nothing says why no wind was saved.
- **F9:** any save (a target, shelter, an effort) reloads every forecast on the opportunity board, and after one Refresh or the 30-minute expiry each of those reloads bypasses the cache.
- **F7:** opening the same opportunity twice does nothing; the second Open does not move the forecast back to the best hour.

## Proposed outcome

- A candidate effort with a sample gap over 60 s is not matched.
- Removing an effort while past wind loads keeps it removed; wind is applied by effort ID to the efforts stored when the response arrives.
- A timed-out past-wind load says "Past wind timed out; try again."
- Saving a route's settings does not refetch the board; only a change to a route's start, its confirmation, Refresh or the expiry does, and only Refresh or expiry forces past the cache.
- Every Open on an opportunity moves the forecast to its best hour.

## Affected users and parts

`packages/analysis/src/effort-match.ts`, `apps/web/app/routes/efforts-panel.tsx`, `opportunity-board.tsx`, `route-drawer.tsx`, `wind-preview.tsx`, their tests, `docs/design.md`.

## Constraints

Analysis stays pure with 100 % coverage. No new network requests; F9 removes some. Deterministic calculations. No change to stored data.

## Out of scope

Deferred after review: F5 (quadratic regex on malformed GPX), F6 (size check before read), F8 (target draft across tabs), F11 (effort row memoisation), and sequential archive ranges under one timer. Rejected: F12, F13, and F1/F2 as defects (owner decisions in `docs/design.md`; rewording `AGENTS.md` is the owner's call).

## Open questions

None.
