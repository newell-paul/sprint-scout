# Dashboard brand

Status: done
Opened: 24 October 2026 by Paul Newell

## Problem

The engineering dashboard at `/dashboard/` names DM Sans and Outfit, which no visitor has installed, so it falls back to Helvetica or Arial. It has no logo. Next to the Aero Stealth planner it looks like a different product.

## Proposed outcome

- The dashboard header shows the SprintScout mark and wordmark from the planner.
- Text is set in Inter and numbers and code in JetBrains Mono, from the same committed font files the planner uses.
- Colours and layout stay as they are.

## Affected users and parts

`packages/testing/src/dashboard.ts` (header and styles), `dashboard.cli.ts` (copies the fonts next to `index.html`), `dashboard.test.ts`.

## Constraints

The dashboard keeps its rule of no scripts and no external requests: fonts are served from `/dashboard/fonts/` on the same origin, with their OFL licence. The wordmark meets 4.5:1 contrast in both colour schemes.

## Open questions

None.
