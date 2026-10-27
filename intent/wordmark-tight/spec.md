# Spec: wordmark as one word

From [intent.md](intent.md).

## Behaviour

- Planner header, dashboard header and the banner template: "Scout" follows "Sprint" with no margin, so the two run together as one word at the wordmark's existing letter spacing (−0.03 em). Slant, weights (800 and 700), colours, sizes and the gap to the mark are unchanged, on desktop and phones.
- The README banner and the GitHub social preview are re-rendered with `pnpm banner`.
- Docs prose writes "SprintScout", except in `intent/` folders and the dated "Italic wordmark" entry, which record what was decided at the time.

## Data and privacy

No change.

## Calculations

None.

## Tests

- `dashboard.test.ts`: the brand assertion checks Scout is bold with no word gap.
- No ARIA or visual baseline changes; no e2e change.

## Docs

`docs/design.md` entry "Wordmark as one word — 27 October 2026", superseding the gap in "Italic wordmark".
