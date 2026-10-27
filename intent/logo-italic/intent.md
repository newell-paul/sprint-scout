# High-velocity italic logo

Status: accepted
Opened: 27 October 2026 by Paul Newell

## Problem

The wordmark reads "SprintScout" upright, with "Sprint" in Inter 800 and "Scout" in Inter 600 run together. The owner wants the "High-Velocity Italic" look from their reference image: one forward-slanted group, a space between the words, and the chevron mark slanted to match, so the brand feels faster and the two words read as one family.

## Proposed outcome

On the planner and the engineering dashboard, the logo is "Sprint Scout" in one typeface, slanted forward together with the chevron mark:

- "Sprint" extra-bold white, "Scout" bold teal (`#2dd4bf`), same size and baseline, a word-space gap apart.
- The mark keeps its double chevron and red trajectory and leans by the same angle as the text, close to "Sprint".
- Sizes stay as they are on desktop and phones; the header still fits on one row at 390 px.
- The page heading's accessible name stays "SprintScout"; the link on the dashboard keeps its label.

## Affected users and parts

`apps/web/app/components/logo.tsx`, `apps/web/app/globals.css` (`.logo-word`, `.logo-word-accent`, `.segment-logo`), `packages/testing/src/dashboard.ts` (the `.brand` header). The planner ARIA baseline only if the visible text gains a space. `docs/design.md`.

## Constraints

Fonts stay local (`apps/web/app/fonts.ts`, Inter variable 400 to 800); no font fetched at build or run time. The dashboard keeps no scripts and nothing from another origin. Size and Lighthouse budgets hold.

## Open questions

1. Which of the five mock-ups? Resolved: B, the whole group slanted 12°, "Scout" bold teal.
2. Does the accessible name become "Sprint Scout"? Resolved in spec.md: it stays "SprintScout", the product name used by the page title, the dashboard link and the tests; the gap is spacing, not a space character.
