# Pages deploys the export that passed Checks

Status: done
Opened: 26 October 2026 by Paul Newell

## Problem

The Pages workflow rebuilds the static export and re-runs the export smoke, size and Lighthouse gates that the Checks deploy gate has already passed on the same commit. To do that it installs Chromium and its system libraries on the runner with `playwright install --with-deps`, the step that hung twice on 26 October 2026 and failed the #70 deploy that evening (a stalled attempt, then apt exit code 100). Playwright's CI guide recommends its Docker image over installing on the runner and advises against caching browsers. The repeated work also means the site that goes live is a second build, not the one that was tested.

## Proposed outcome

Pages publishes the exact `apps/web/out` that passed the Checks deploy gate, plus the dashboard. The Pages workflow builds nothing and installs no browser. A manual Pages run republishes the newest export from main.

## Affected users and parts

`.github/workflows/ci.yml` (the deploy gate uploads the export), `.github/workflows/pages.yml`, `packages/testing/src/harness.test.ts`, `docs/test-strategy.md`, `docs/design.md`.

## Constraints

Only a push to main in this repository may supply the published site, the same rule as the dashboard artifact (`docs/lessons.md`, 12 October 2026). Every job keeps a timeout. No new secrets.

## Open questions

1. How long must the export be kept for a manual Pages run? Resolved in spec.md.
