# Unit and component badges

Status: done
Opened: 27 October 2026 by Paul Newell

## Problem

The README badge row shows e2e, coverage, mutation, Lighthouse and evals, but not unit or component tests. The dashboard already records both counts on every `main` run (695 and 96 today), so a reader of the README sees only the top of the test pyramid and has to open the dashboard to learn the lower levels pass.

## Proposed outcome

The README shows a "unit" badge and a "component" badge beside the e2e badge, each reading "passed/total pass", green when nothing failed and red otherwise, grey "n/a" when the run has no report. Option A of three: one badge per level, matching the dashboard's cards.

## Affected users and parts

`packages/testing/src/dashboard.ts` (`badges`), `packages/testing/src/dashboard.test.ts`, `README.md` (badge row), `docs/sdlc.md` (badge list), `docs/design.md`.

## Constraints

No new data source: the counts come from the merged unit report and the component report the dashboard already reads. Badges stay shields endpoint JSON on Pages; nothing new is fetched by the planner.

## Open questions

1. Order of the badges in the README? Resolved in spec.md.
