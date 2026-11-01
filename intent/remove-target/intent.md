# Remove the segment target

Status: done
Opened: 1 November 2026 by Paul Newell

## Problem

A rider can type a target time for each segment, and the cockpit and the board compare it with the estimate ("Estimate 3s inside target"). The estimate is the reference rider on a flat road, so comparing it with a real best time is shaky, which is why efforts were removed. The owner finds the target unnecessary now.

## Proposed outcome

- No Target section, no target comparison in the cockpit and no target line on the board.
- The opportunity board stays, unchanged otherwise.
- Every saved library still loads. A stored target is dropped on read, whatever it holds.

## Affected users and parts

- Riders who set targets: the comparison goes.
- `apps/web`: the target section, cockpit, board, wind preview, drawer, library and styles.
- Unit, component and e2e tests, ARIA baselines.
- `README.md`, `docs/design.md`.

## Constraints

Every saved library still loads. No new network request. Size and Lighthouse budgets.

## Decisions (owner, 1 November 2026)

1. Remove the target; keep the opportunity board.

## Open questions

None.
