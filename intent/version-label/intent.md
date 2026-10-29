# Version label

Status: accepted
Opened: 29 October 2026 by Paul Newell

## Problem

The footer reads "© OpenStreetMap contributors · v0.9.0 659ec4d · Data & privacy". The version follows the OpenStreetMap credit in the same link colour, with nothing naming the app, so it reads as OpenStreetMap's version rather than SprintScout's.

## Proposed outcome

Nobody can mistake the version for the map's. The version is clearly SprintScout's: named, set apart from the map credit, and in the app's own colours (white and teal, as in the wordmark) rather than the credit's coral link colour. It still links to its GitHub release, still shows the short commit, and still makes no request.

## Options

Rendered side by side for the owner on 29 October 2026:

- **A. Name it.** "SprintScout v0.9.0 659ec4d" on the right of the footer row, with the name in white and teal, the version link in teal and the commit muted. The credit and Data & privacy stay on the left.
- **B. Version pill, right-aligned.** The same text in a teal-outlined pill on a faint teal fill, at the right end of the footer row.
- **C. Two lines.** The app's own line ("SprintScout v0.9.0 659ec4d · Data & privacy") first, with "Map data © OpenStreetMap contributors" on its own line below.
- **D. Header badge.** A small teal "v0.9.0" pill beside the wordmark in the header, with the commit in its tooltip and accessible name. The footer keeps only the credit and Data & privacy.

## Affected users and parts

Every rider and anyone filing a bug report. `apps/web/app/routes/build-stamp.tsx` and its component test, `route-drawer.tsx` (footer or header), `apps/web/app/globals.css`, `docs/design.md`. The OpenStreetMap credit's wording and link stay as the attribution guidelines need them.

## Constraints

No request. The OpenStreetMap credit stays visible and unchanged in wording. Text contrast passes the axe check on the dark background, and the link stays distinguishable without colour. Fits a 390 px phone without a dangling separator. Lighthouse and size budgets hold.

## Open questions

Resolved by the owner on 29 October 2026:

1. Which option? D: a version badge in the header beside the wordmark. The footer keeps only the credit and Data & privacy.
2. Keep the short commit visible? No. It goes in the badge's tooltip and accessible name, as option D describes.
