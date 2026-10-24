# Plan: Remove the synthetic demo

From [spec.md](spec.md).

## Files

- **Web:**
  - Deleted: `apps/web/app/demo/`, `apps/web/app/api/planner/`, and `components/planner.tsx`, `route-map.tsx`, `hour-chart.tsx`, `ride-effect.tsx` with their tests and `__aria__` files if any.
  - `globals.css`: the demo-only rules go and `.primary` is moved, as in the spec.
  - `health/route.server.ts`: drops `mode`.
  - `next.config.ts`: drops `@scout/providers`.
  - `apps/web/package.json`: drops `@scout/contracts` if nothing in `apps/web` still imports it.
- **`packages/ui`:** `index.tsx` (DemoBanner), `route-map.tsx`, `hour-chart.tsx`, `map.css`, `configureMapLibre` and their tests are deleted; `package.json` exports and dependencies are trimmed to `maplibre`.
- **`packages/application`:** deleted: `index.ts`, `policy.ts`, `wind.ts`, `forecast.ts`, `time.ts`, `planner.ts`, `weather-demo.ts`, `departure.ts`, `wind.benchmark.ts` and their tests. `package.json` exports and dependencies are trimmed.
- **`packages/providers`, `packages/database`, `apps/api`:** deleted.
- **`packages/contracts/src/index.ts`, `index.test.ts`:** dead exports removed.
- **`packages/analysis`:**
  - `src/index.ts` loses the ranking block;
  - `ranking.golden.test.ts` and `fixtures/evaluate-hour.golden.json` are deleted;
  - `wind.property.test.ts`, `wind.test.ts`, `analysis-errors.test.ts` and `boundaries.test.ts` lose the cases for removed functions.
- **`packages/testing`:**
  - `src/bands.ts`: optional `since`;
  - `src/bands.test.ts`: tests for it;
  - `bands.yaml`: `since` on the five bands;
  - `src/dashboard.ts`: the database job wording.
- **Tests:**
  - `e2e/demo.spec.ts` and `e2e/pages/demo.ts` are deleted;
  - `e2e/fixtures.ts` and `e2e/pages/index.ts` drop the demo page object;
  - `e2e/visual.spec.ts` drops the demo chart test, and its baseline goes through `git rm`;
  - `playwright.static.config.ts` drops its ignore.
- **Repository:**
  - `compose.yaml` is deleted;
  - `.github/workflows/ci.yml` loses the database job;
  - `vitest.config.ts` loses the integration project and its excludes;
  - the root `package.json` scripts change;
  - `knip.json`, `.dependency-cruiser.cjs`, `stryker.config.json` and `cspell.json` change;
  - `pnpm-lock.yaml` is regenerated.
- **Docs:** `AGENTS.md`, `README.md`, `docs/implementation-plan.md`, `docs/test-strategy.md`, `docs/sdlc.md`, `docs/validation.md`, `docs/integration-decisions.md`, `docs/lessons.md`, `docs/design.md` (new entry), `intent/aero-stealth/plan.md` (follow-up link).
- **Owner step:** remove the `DATABASE_URL` line from the env example (agents may not open it).

## Order

Each step leaves `pnpm typecheck` and the unit tests passing.

1. **Band `since`, test first.** Write the `bands.test.ts` cases and see them fail, implement `since` in `bands.ts`, then see them pass. `bands.yaml` stays unchanged until step 8.
2. **Web.** Remove the demo route, the API route, the demo components and their e2e, visual and page-object code. Trim `globals.css`, `health` and `next.config.ts`.
3. **`packages/ui`.** Trim it to `maplibre`.
4. **`apps/api`, `packages/database`, `compose.yaml`.** Remove them, with the database CI job, the integration project and the root scripts.
5. **`packages/application`.** Remove the root entry and its modules, then `packages/providers`.
6. **`packages/analysis` and `packages/contracts`.** Remove the dead exports and the tests of removed code.
7. **Configs.** Update knip, dependency-cruiser, stryker, cspell and the static Playwright config; run `pnpm install` to regenerate the lockfile; confirm `pnpm knip` reports nothing unused.
8. **Docs, then bands.** Write the docs and the design entry. As the last commit before merge, set `since` in `bands.yaml` and set the intent status to `done`.

## Proof

- **Step 1:** the new `bands.test.ts` cases fail before `since` exists and pass after.
- **Static gates:** `pnpm knip`, `pnpm boundaries`, `pnpm typecheck` and the static gates in `pnpm verify` are clean.
- **`/` unchanged:** `pnpm test:e2e`, with the privacy, a11y and keyboard specs and every `__aria__` file unchanged; `pnpm test:visual` (Docker) passes the three planner baselines without an update.
- **Coverage:** `packages/analysis` stays at 100 %.
- **Deploy gate:** `pnpm check:deploy` stays within the size and Lighthouse budgets, with the bundle expected to shrink.
- **Grep:** `git grep -i -e demo -e fastify -e testcontainers -e echarts` finds only dated history, the env-refusal canary and this intent.
- **Final check:** `pnpm verify` green through the verifier agent; on the pull request, Checks green, including the dashboard job.
