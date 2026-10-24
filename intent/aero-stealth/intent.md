# Aero Stealth redesign

Status: done
Opened: 24 October 2026 by Paul Newell

## Problem

The planner on `/` reads as a light utility page. The owner wants a dark, data-dense "Aero Stealth" look: deep navy surfaces, glowing route and wind accents, and a cockpit-style analytics row. The reference is the owner's brief and the mock-up `docs/images/new-design.png`. The image's text is AI-generated and garbled, so it is a mood reference, not copy.

## Proposed outcome

- The planner is dark only: deep navy background, layered translucent panels, white and slate text, cyan and teal for wind and data, crimson and orange for the best hour and the route.
- Inter for text, JetBrains Mono for numbers, both served from the repo.
- Header with a chevron logo, "Sprint" in white and "Scout" in cyan, segment pills and a units toggle.
- A dark map with a glowing route, clear direction arrows, Start and Finish labels and a wind badge.
- A timeline card with Today, Tomorrow and Best hour capsules, translucent night bands and a glowing scrub handle.
- An analytics row of three cards: speed dial, estimated time, wind compass.
- `/demo` moves onto the same tokens last and drops its light theme.
- Existing copy, behaviour, data flow and privacy stay as they are.
- Every stage is checked by the owner on the local dev server before it merges. Nothing deploys until the owner accepts the full design.

## Affected users and parts

`apps/web/app/globals.css`, `apps/web/app/fonts.ts` and `apps/web/app/fonts/`, `components/logo.tsx`, `ride-cockpit.tsx`, `time-chart.tsx`, the panels under `app/routes`, the drawing map's raster paint, `packages/ui` (hour chart and route map), visual baselines, ARIA snapshots where structure changes, `docs/design.md`.

## Constraints

- No new external services: OpenStreetMap raster tiles stay, darkened by MapLibre raster paint. Fonts are committed woff2 files (download approved by the owner), loaded with `next/font/local`.
- WCAG AA contrast for all text; Lighthouse accessibility, performance and best practices at least 0.9; size limits hold.
- Reduced motion turns off glows that animate and all transitions.
- No calculation changes; the UI still does no ranking maths.

## Open questions

1. Which pages first? Resolved: planner first, `/demo` last.
2. Keep a light theme? Resolved: dark only.
3. Fonts? Resolved: Inter and JetBrains Mono, committed locally.
4. Best hour accent? Resolved: crimson and orange from the brief, not the mock-up's teal.
