# Borderless Aero Stealth wordmark in the header

Status: accepted
Opened: 26 October 2026 by Paul Newell

## Problem

The header logo is the app icon tile: a 56 px rounded square with its own background, next to a 38 px wordmark. On the planner's dark slate it reads as a pasted-in image rather than part of the page, and it dwarfs the segment row beneath it. The target look is in `docs/images/logo-change.png`.

## Proposed outcome

The planner header shows a transparent, borderless mark: two forward-leaning teal-to-cyan chevrons with speed streaks on the left and a coral-red swoosh arcing behind them, sitting flat on the page background. Next to it, "Sprint" in heavy white and "Scout" in teal (#2DD4BF), smaller than today so the header is compact. The dashboard's brand matches. The favicon and the iPhone Home Screen icon keep the app icon tile.

## Affected users and parts

`apps/web/app/components/logo.tsx`, `apps/web/app/globals.css`, `packages/testing/src/dashboard.ts` and its test, the header screenshot baselines.

## Constraints

No new network request: the mark is inline SVG. No change to page state, routing or the segment row. Bundle size stays under its ceiling. The logo stays decorative for assistive tech, so the heading still reads "SprintScout".

## Open questions

1. Header band or page background? Resolved: page background, as the mock-up shows (owner, 26 October 2026).
2. Size? Resolved: 36 px mark and 30 px text on desktop, 30 px and 24 px on phones (owner, 26 October 2026).
3. Segment buttons beside the logo or on their own row? Resolved: their own row (owner, 26 October 2026).
