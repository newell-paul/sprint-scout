# Recent runs strip

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

The Pipeline section has two cards and an empty space beside them, and its "First-pass success" figure doesn't show which runs it is made of. While building the strip, a bug turned up: the dashboard job reads the run list while its own Checks run is still in progress. gh lists that run with conclusion `""`, so it was counted as a failed run, and as the latest run for "Checks duration".

## Proposed outcome

- **Last 30 runs card:** beside the two pipeline cards, spanning two columns. It shows one bar per Checks run on main, oldest left and the newest glowing. A bar's height is the run time and its colour is the result:
  - teal for passed first time;
  - orange for passed on a rerun;
  - red for failed;
  - grey for cancelled (superseded by a newer push).

  A legend gives the counts, and each bar's tooltip gives the run's start time, result and duration. The owner chose bars over squares, a ring or a timeline from mock-ups.

- **In-progress run:** left out of the pipeline figures.
- **Cancelled runs:** left out of first-pass success and the latest duration.
- **Run list:** the job fetches 31 runs, so 30 completed ones remain.

## Affected users and parts

- `packages/testing/src/dashboard.ts`: `pipelineSummary` gains `recent`; `appendHistory` keeps it on the newest entry only; the new card.
- `dashboard.test.ts`.
- `.github/workflows/ci.yml` (`--limit 31`).
- `docs/lessons.md`, `docs/design.md`.

## Constraints

- No scripts and no external requests.
- The strip has `role="img"` with a label giving every count.
- Older history entries don't keep their run lists.

## Open questions

1. Should cancelled runs count against first-pass success? No (owner, 25 October 2026): 7 of the last 30 runs were cancelled by a newer push. They are left out of the rate and of the latest duration, and the strip still shows them in grey.
