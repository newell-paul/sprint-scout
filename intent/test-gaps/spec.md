# Spec: test gaps

## Behaviour

- **C1:** choosing a segment from the slot picker clears the board's requested hour, so the segment opens at its first forecast hour. Open on the board still jumps to that segment's best hour.

## Data and privacy

No change.

## Calculations

None.

## Tests

- e2e `board.spec.ts`: "a segment picked by hand after Open starts at its first hour" (fails before the fix).
- e2e `drawing.spec.ts`: "renaming keeps the segment's target, shelter and efforts".
- e2e `clock.spec.ts`: "a board left open re-ranks every segment once its forecasts expire".
- component `efforts-panel.browser.test.tsx`: "efforts on more date ranges than one load allows finish on the next press".
- e2e `forecast.spec.ts`: tomorrow lands on hour 16 (local midnight in London from 07:00 UTC).
- No ARIA baseline changes.

## Docs

`docs/design.md` entry "Hand-picked segment opens at its first hour — 25 October 2026"; `docs/lessons.md` entry for C1.
