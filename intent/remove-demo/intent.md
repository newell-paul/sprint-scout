# Remove the synthetic demo

Status: done
Opened: 24 October 2026 by Paul Newell

## Problem

`/demo` is a synthetic planner from the first milestones. It is unlinked, absent from the Pages build, and lost its MCP role on 22 September 2026. After the Aero Stealth redesign the owner opened it and could not tell what it was for: it looks like a second app with made-up data. It still costs upkeep. It has its own components, ECharts, CSS, e2e specs and a visual baseline. It also has a Fastify API (`apps/api`) and a Postgres package (`packages/database`) whose only table holds the demo segments. A CI job starts that database in testcontainers on every push.

## Proposed outcome

- `/demo` and `/api/planner` no longer exist; the planner on `/` is the only screen.
- Nothing in the repository serves, seeds or stores synthetic segments or synthetic weather at runtime.
- `apps/api`, `packages/database`, `compose.yaml` and the "Database (testcontainers)" CI job are gone. `apps/worker` stays as a reserved boundary.
- Dependencies used only by the demo (ECharts, Fastify, Postgres and Drizzle clients, testcontainers) leave the lockfile.
- Docs, the architecture section of `AGENTS.md` and the dependency-cruiser rules describe the repository as it now is. Earlier `docs/design.md` entries stay as history, and a new dated entry records the removal.
- `pnpm verify`, `pnpm check:deploy` and Checks on the pull request are green, with no loss of coverage on the planner.

## Affected users and parts

- Users of `/`: no visible change.
- `apps/web`: `app/demo`, `app/api/planner`, `components/planner.tsx`, `route-map.tsx`, `hour-chart.tsx`, `ride-effect.tsx` and their demo CSS in `globals.css`; `next.config.ts` and `health` if they name the demo.
- `packages/ui`: `DemoBanner`, `route-map`, `hour-chart`; `maplibre` stays (the planner uses it).
- `packages/application`, `providers`, `contracts`: `getPlannerData`, `getDemoForecast`, `getDemoConditions`, `listDemoSegments`, `demoSegments`, `defaultPlannerRequest` and whatever only they use.
- `apps/api`, `packages/database`, `compose.yaml`, `.github/workflows/ci.yml` (database job), `stryker.config.json`, `playwright.static.config.ts`.
- Tests: `e2e/demo.spec.ts`, `e2e/pages/demo.ts`, the demo visual test and its baseline, and unit tests of removed code.
- Docs: `AGENTS.md`, `README.md`, `docs/design.md`, `docs/implementation-plan.md`, `docs/test-strategy.md`, `docs/sdlc.md`, `docs/validation.md`, `docs/integration-decisions.md`.

## Constraints

- No Strava data, no new external services, consent before any network request; the privacy e2e tests keep passing.
- Calculations stay deterministic; `packages/analysis` keeps 100 % coverage and its property tests.
- Static export only; bundle size and Lighthouse budgets hold or improve.
- Synthetic fixtures inside tests are test data, not the demo, and may stay.
- One pull request, merged only when the owner asks and Checks are green.

## Open questions

1. Which `packages/application` and `packages/analysis` code (provenance policy, ranking, golden fixtures) still has a caller on `/` once the demo goes, and which is dead?
2. What do `.env.example` and `evals/env-refusal` use the demo for, and do they need a replacement value?
3. Does the engineering dashboard or `packages/testing/bands.yaml` count the removed database job or the demo tests, so their numbers need a note or a new baseline?
4. Do the dependency-cruiser and knip configs name the removed packages?
5. With the demo chart gone, three visual tests remain. Is that enough, or should one planner view replace it?
