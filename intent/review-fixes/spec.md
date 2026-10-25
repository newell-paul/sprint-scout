# Spec: review fixes

From [intent.md](intent.md).

## Behaviour

- **F4, effort matching:** a candidate effort does not start on, and ends at, a pair of samples more than `trackLimits.gapSeconds` (60 s) apart. A ride paused for longer than that inside the segment yields no effort; a 59 s gap still matches. `sampleGapSeconds` is still reported.
- **F3, efforts writes:** a GPX import and a past-wind load build on the efforts stored when they finish, not those they started with. An effort removed while past wind loads stays removed.
- **F10, past-wind timeout:** after 20 s the load stops and the panel says "Past wind timed out; try again." An abort on unmount stays silent.
- **F9, board fetching:** the board refetches when a route is added or removed or its start point or confirmation changes, on Refresh, and on forecast expiry. Saving a target, shelter, terrain or effort does not refetch. Only the fetch started by Refresh or expiry bypasses the forecast cache.
- **F7, reopening an opportunity:** each Open sends a new request, so the forecast moves to the opportunity's hour even when it is the same hour as last time.

## Data and privacy

No new requests; F9 removes redundant ones.

## Calculations

F4 changes `matchEfforts` only by enforcing the existing gap limit. Deterministic and pure.

## Tests

- **Unit:** `effort-match.test.ts`: a 61 s cadence yields nothing, a 59 s cadence one effort; an hour's pause straddling the start line yields nothing.
- **Component:** new `efforts-panel.browser.test.tsx` (removal during a slow archive response; timeout message), `opportunity-board.browser.test.tsx` (a settings save after Refresh makes no forecast request), `wind-preview.browser.test.tsx` (a repeated request moves back to its hour). The msw archive handler gains `slow` and `timeout` faults.

## Docs

`docs/design.md`: the effort-matching paragraph states the gap limit; a dated entry for the fixes.
