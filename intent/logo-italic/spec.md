# Spec: high-velocity italic logo

## Behaviour

- Planner header and dashboard header: the mark and "Sprint Scout" lean forward together by 12° (`skewX(-12deg)` on the whole logo group, anchored at its bottom-left so it leans right and the mark is never clipped at the left edge), option B of the five mock-ups shown on 27 October 2026.
- "Sprint" stays Inter 800 white; "Scout" becomes Inter 700 (from 600) in teal `#2dd4bf`, same size and baseline.
- A word-space gap (0.26 em, Inter's space width) separates the words. It is a margin, not a space character, so the text and accessible name stay "SprintScout".
- Mark size, word size, gap to the mark and drop shadow are unchanged on desktop (52 px mark, 42 px words; dashboard 2.6 rem) and phones (40 px, 32 px; dashboard 2 rem). The planner header still fits on one row at 390 px.
- Mobile, empty and error states: no change; the logo is the same in every state.

## Data and privacy

No change. Fonts stay the committed Inter variable file; the dashboard still loads nothing from another origin.

## Calculations

None.

## Tests

- The e2e heading check (`library.spec.ts`, name "SprintScout", mark decorative) stays and must pass unchanged.
- `dashboard.test.ts`: the brand markup assertion is unchanged; a new assertion that the dashboard CSS slants `.brand` by 12° and sets `.brand b` to weight 700 with the word gap.
- No ARIA baseline changes: the text content is unchanged. Visual check on the dev server at desktop and 390 px.

## Docs

`docs/design.md` entry "Italic wordmark — 27 October 2026".
