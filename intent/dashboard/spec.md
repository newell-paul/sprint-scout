# Spec: engineering dashboard

## Behaviour

- One page, six sections, each a grid of metric cards with a status tone (good, watch, poor) where a threshold exists, and a sparkline over the recorded runs where there is history:
  - Pipeline: Checks duration (latest and trend), first-pass success rate over the last 30 runs on `main`.
  - Tests: unit, component and end-to-end counts and durations, end-to-end duration trend, slowest ten, flake-free streak (consecutive runs with no end-to-end failure).
  - Quality gates: line and branch coverage with trend, mutation score with trend, type coverage.
  - Performance: Lighthouse performance, accessibility, best practices and SEO scores, largest contentful paint and total blocking time against the budgets, client JavaScript size against its ceiling.
  - AI practice: eval pass rate with trend, model and cost of the last run, intents by status with opened dates, review findings and fix-loop share marked "not collected yet".
  - Delivery: median pull request cycle time and merges per week for the last eight weeks, from the GitHub API.
- Missing inputs leave a card at "n/a" and never fail the build. Old history entries without the new fields render the same way.
- The page has no scripts, loads nothing external, and follows the system colour scheme using the planner's tokens.
- `badges/*.json` in the shields endpoint schema: evals, mutation, coverage, lighthouse, e2e.
- `/test-health/` carries a static meta-refresh redirect to `../dashboard/`.

## Data and privacy

Everything comes from CI artifacts and the repository's own GitHub API data read with the job token. Nothing about app users exists.

## Calculations

- Mutation score as before. Lighthouse scores from the representative run in `.lighthouseci/manifest.json`, metrics from its report. Bundle from `size-limit --json`.
- First-pass rate: successful runs with attempt 1 over all completed runs in the window. Cycle time: median hours from `createdAt` to `mergedAt`. Merges per week: ISO-week buckets ending this week.
- Flake-free streak: count back from the latest snapshot while `e2e.failed === 0`.
- All pure functions with fixed inputs in the unit tests.

## Tests

`packages/testing/src/dashboard.test.ts`: snapshot from every input and from none, each calculation, history merge, render contains each section and escapes titles, badges schema. Workflows validated as YAML.

## Docs

`docs/test-strategy.md` references, `docs/sdlc.md` progress, a dated `docs/design.md` entry for the published page, README badges and link.
