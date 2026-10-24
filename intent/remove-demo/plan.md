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

## As built

- The perf project went too: its only test, `wind.perf.test.ts`, timed the removed ranking path. So did `pnpm test:perf`, its step in the deploy gate job, and ", perf" in that job's name.
- The `main` ruleset lists "Database (testcontainers)" and the old deploy gate name as required checks. The owner updates the ruleset before merge, because a required check that no longer runs blocks the pull request.
- `since` is a date (`YYYY-MM-DD`), not a timestamp: dashboard snapshots are dated by day. It is set to the day of the removal; runs earlier that day stay in the baseline, but there are too few of them to make a band live.
- `.primary` stayed where it was instead of moving, since the rules around it were removed and it is already shared. `.empty` went: `.segment-slot` sets its own padding later in the file, and the slots are flex buttons, so `text-align` had no effect.
- `configureMapLibre` went with the demo's self-contained host; the loader always uses the served worker.
- `analysis-errors.test.ts` keeps its geometry case; only the case for the removed hour evaluation went.
- `.prettierignore` lost its `apps/api/fixtures` line. `README.md` lost its "Beyond the planner" section.
- After the owner's edit, the env example holds only a comment naming `compose.yaml`. Agents may not open or remove it, so deleting it is an owner step.
- `docs/validation.md`, `docs/integration-decisions.md` and `docs/lessons.md` are dated records and stay as written.
- `utcInstant` stays in `packages/contracts`: `provenance` uses it for `retrievedAt` and `expiresAt`.
- `packages/analysis/fixtures/ranking.golden.json` went too; nothing read it once the ranking tests were gone.
- The dependency-cruiser rule naming `providers` and `database` became `app-code-never-ships-test-helpers`: planner code reaches `@scout/testing` only from tests.
- `docs/sdlc.md` needed no change. In `docs/design.md`, the stack table rows for the HTTP API, storage and charts are marked removed, the same way as the withdrawn MCP rows.
