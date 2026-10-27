# README banner from the real logo

Status: accepted
Opened: 27 October 2026 by Paul Newell

## Problem

The README banner (`docs/images/banner.jpg`) and the GitHub social preview are AI-generated images that still show the old upright "SprintScout" wordmark and an imagined dashboard. Since the italic logo shipped, the banner no longer matches the planner, and a hand-made raster has to be redrawn by hand every time the brand changes.

## Proposed outcome

- The README banner and the social preview show the current italic logo, built from the planner's own mark file, Inter font and colours, beside a real screenshot of the planner.
- One command renders both images again, so the next brand change is a rerun, not a redraw.
- The social preview leads with the logo; the README banner, which sits under the `# SprintScout` heading, gives the logo and tag line equal weight (option v2 of the drafts shown on 27 October 2026).

## Affected users and parts

`docs/images/banner.jpg` (replaced), a new `docs/images/social-preview.jpg`, a banner template and render script under `scripts/`, a root `banner` package script, `README.md` only if the alt text changes, `docs/design.md`. The planner itself does not change.

## Constraints

No change to what the planner fetches. The script runs only when the owner runs it, against a local dev server; it is not part of CI or the deploy. Fonts and the mark come from the repo, nothing from another origin. The social preview stays under GitHub's 1 MB limit.

## Open questions

1. Does the screenshot come from live data or fixtures? Resolved in spec.md.
2. Does CI regenerate the images? Resolved in spec.md.
