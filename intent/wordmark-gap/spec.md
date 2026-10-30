# Spec: wordmark gap

From [intent.md](intent.md).

## Behaviour

- Planner header, dashboard header and banner template: "Scout" has `margin-left: 0.09em`, so it scales with the wordmark on desktop and phones. Nothing else in the wordmark changes.
- The README banner and social preview are re-rendered with `pnpm banner`.

## Data and privacy

No change.

## Calculations

None.

## Tests

- `dashboard.test.ts`: the brand assertion checks Scout is bold with a 0.09 em gap.
- No ARIA, visual or e2e change.

## Docs

`docs/design.md` entry "Wordmark gap — 28 October 2026", superseding the no-gap rule in "Wordmark as one word".
