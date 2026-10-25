# Remove the availability window code

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

The availability window left the interface on 14 September 2026, but its code stayed: a predicate with tests, and an `availability` prop through the forecast panel, the opportunity board, `rankOpportunities` and `bestHourIndex`, always passed `null`. The whole-repository review on 25 October 2026 flagged it as dead weight, and the owner asked for it to be removed.

## Proposed outcome

No availability code, prop, wording or test remains. Best hour and the board behave as they do now.

## Affected users and parts

`apps/web/app/routes/attempt.ts`, `conditions.ts`, `opportunities.ts`, `opportunity-board.tsx`, `wind-preview.tsx`, `route-drawer.tsx` and their tests; `docs/design.md`.

## Constraints

No visible change apart from the "no eligible hour" message, which no longer mentions availability.

## Open questions

None.
