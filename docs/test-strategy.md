# Test strategy

Status: delivered; T1 to T8 done by 14 September 2026, figures refreshed 9 October 2026. Companion to [design.md](design.md) and [implementation-plan.md](implementation-plan.md). Deliver one milestone at a time; each milestone ends with lint, typecheck and the full suite green.

## 1. Where we are

| Area                    | Today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Gap                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Static analysis         | Done 13 Sep 2026 (T2): ESLint with React, hooks, jsx-a11y, Playwright, Vitest, import-x and unicorn rules; dependency-cruiser boundaries; knip; type-coverage at 99.6 %; cspell; markdownlint; gitleaks in CI                                                                                                                                                                                                                                                                                                                           | type-coverage 99 % → 100 % (169 implicit `any` types, mostly in parsers)                                                     |
| Unit (Vitest)           | Done 13 Sep 2026 (T3): 44 files, 332 tests; coverage gates (analysis 100 %, application 95 %, global 80 %); fast-check invariants; exact-boundary suite; golden fixtures; Stryker on demand with an 80 % break; first suites for contracts and ui                                                                                                                                                                                                                                                                                       | Mutation break 80 % → 85 % (`route-wind.ts`, `planner.ts`, `terrain.ts` need boundary tests); database suite delivered in T8 |
| Contract                | Recorded Open-Meteo fixtures behind Zod contract schemas, shared msw and Playwright handlers in `packages/testing`, storage migration fixtures, API contract snapshots, advisory live drift check in CI (T4, 13 Sep 2026)                                                                                                                                                                                                                                                                                                               | Hand-written unit fixtures in providers and application remain for edge cases by design                                      |
| Component               | Done 13 Sep 2026 (T5): Vitest browser mode in real Chromium for the seven components, about 90 tests, one per state, each with an ARIA snapshot beside the test and an axe run; recorded Open-Meteo through the shared msw worker                                                                                                                                                                                                                                                                                                       | Rider settings, conditions detail, efforts panel and the drawer are covered only through the preview and journeys            |
| Integration             | Done 14 Sep 2026 (T8): Fastify `inject` suite; `pnpm test:integration` runs migrate and seed twice against a throwaway Postgres through testcontainers and asserts idempotency and the synthetic-only constraint (in CI)                                                                                                                                                                                                                                                                                                                | Worker has no runtime to test; no negative policy-gate suite                                                                 |
| End-to-end (Playwright) | Done 13 Sep 2026 (T1, T4, T6): 16 spec files, 127 atomic scenarios averaging 20 lines; families for drawing, library, concurrency, forecast, rider, board, attempt, shelter, terrain, efforts, demo, faults, clock, keyboard, privacy and visual; three projects, four CI shards, one merged report; the Open-Meteo stub is automatic so no test can reach the live API; the drawing and demo journeys count route-coloured pixels on the map canvas, because the MapLibre 6 upgrade blanked every GeoJSON layer without failing a test | Visual baselines are Linux renders from the Playwright container (`pnpm test:visual:update`)                                 |
| Accessibility           | axe after every e2e test and every component state (T1, T5); allowlist with owner and expiry; WebKit runs 16 `@a11y` and `@keyboard` scenarios, Pixel 7 runs 7 `@mobile` scenarios; keyboard-only journeys for drawing, hour selection, terrain and the hourly table (T6)                                                                                                                                                                                                                                                               | Component axe has no allowlist yet                                                                                           |
| Non-functional          | Done 13 Sep 2026 (T7): deploy gate on the static export (smoke journeys under the Pages base path, size-limit ceiling 550 kB brotli on client JavaScript, Lighthouse categories at 90 or above with LCP 2.5 s, TBT 300 ms and a script budget of 650 kB gzip), `wind.perf.test.ts` p95 budgets, `pnpm audit --prod` and OSV scan in CI                                                                                                                                                                                                  | Lighthouse runs on desktop only; a mobile preset waits for a phone-first layout pass                                         |
| CI                      | Parallel jobs: static, unit (2 shards, merged coverage gate), components, e2e (4 shards, merged HTML report), testcontainers, OSV, advisory contract drift, dashboard on main; mutation on manual dispatch only                                                                                                                                                                                                                                                                                                                         | None open                                                                                                                    |

## 2. Principles

1. **Atomic.** One behaviour per test, its own data, its own mocks, no ordering. A test name reads as a sentence: `<subject> <does what> when <condition>`.
2. **Parallel by default.** Every level runs with maximal workers. Isolation comes from fixtures, unique IDs and per-test storage, never from serialisation.
3. **Deterministic at the boundary.** Clock, network and storage are controlled in every test. Exactly one job talks to the real internet, and it is advisory and non-blocking.
4. **Push tests down.** A rule is proven at the lowest level that can prove it. Journeys prove wiring, not arithmetic.
5. **Accessible by construction.** Roles and names are the primary selectors; `data-testid` only for numeric readouts. Every page state passes axe and has an ARIA snapshot.
6. **Fast feedback.** PR gate under five minutes wall-clock. Anything slower runs sharded; mutation runs only on manual dispatch.
7. **Same mocks everywhere.** One MSW handler set built from recorded provider fixtures feeds unit, component and Playwright tests.

## 3. Levels and what goes where

### L0 · Static quality gates

- ESLint flat config adds `eslint-plugin-react`, `react-hooks`, `jsx-a11y`, `eslint-plugin-playwright`, `eslint-plugin-vitest`, `import-x` (cycle and boundary rules), and a small `unicorn` subset.
- **Architecture boundaries** with `dependency-cruiser`: `apps/web` may not import `packages/providers` or `packages/database`; `packages/analysis` imports nothing from the workspace. This mechanises the design.md rule that UI never implements ranking math.
- `knip` for dead exports and unused dependencies; `type-coverage --strict` at 100 %.
- Secret scanning with `gitleaks` in CI; run `gitleaks git --staged` locally before a commit. Enforces "never expose Strava OAuth tokens or weather API credentials".
- Prettier applied to docs (remove them from `.prettierignore`), `markdownlint`, and `cspell` with a project dictionary.
- Licence and attribution check: a test asserts the OpenStreetMap and Open-Meteo attribution strings render on every page that uses them.

### L1 · Unit (Vitest, all packages)

- **Coverage gates** with `@vitest/coverage-v8`: `packages/analysis` 100 % branches, `packages/application` 95 %, everything else 80 %, ratcheted upward only. The report leaves out entry points and fixtures that run outside the unit project (`*.cli.ts`, `apps/api/src/server.ts`, the drift script, the Playwright and Vitest browser fixtures in `packages/testing`), so the figure measures behaviour; see `vitest.config.ts`.
- **Property-based tests** with `fast-check` for the deterministic core:
  - `projectWind`: `tailwind² + crosswind² = speed²`; reversing the leg negates tailwind; rotating wind and leg together is invariant.
  - `estimateRouteRideEffect`: more tailwind never increases time; shelter factors are monotonic; the estimated range always contains the point estimate.
  - `resolveLocalWindow`: round-trips through every IANA zone in a fixed list including DST gaps and overlaps.
  - `readLibrary`: arbitrary JSON never throws anything but the documented error, and valid input is idempotent (`read(stringify(read(x))) = read(x)`).
- **Golden tests** for ranking: recorded inputs and expected orderings under `packages/analysis/fixtures`, reviewed like snapshots.
- **Mutation testing** with StrykerJS on `packages/analysis` and `packages/application`, on manual dispatch, mutation score gate 85 %.
- `vitest --shard` across two CI workers; `--changed` locally for test impact analysis.
- Untested packages get a first suite: `packages/contracts` (schema round-trips and error codes), `packages/ui` (pure formatters), `packages/database` (migration list is ordered and idempotent).

### L2 · Contract

- **Recorded provider fixtures.** Recorded Open-Meteo forecast, elevation and archive responses live in `packages/testing/fixtures/open-meteo/*.json` with the request that produced them.
- **Consumer-driven schemas.** Zod schemas in `packages/contracts` describe what we rely on. A test parses every fixture; an advisory CI job re-fetches the same requests and parses the live responses, so provider drift shows on the run rather than in a user session.
- **Single mock source.** MSW handlers in `packages/testing` serve those fixtures, with helpers for faults: timeout, 429 with `Retry-After`, 503, partial nulls, oversized body. Vitest uses `msw/node`; Playwright uses `page.route` handlers generated from the same fixtures.
- **Storage contract.** `sprint-scout.drawn-routes.v1` and rider storage get versioned migration fixtures; a test proves every historical shape still loads and that unknown fields survive a round-trip.
- **HTTP API contract.** Fastify routes are described by Zod; the route tree is snapshotted in `apps/api/fixtures/routes.contract.txt` and exercised through `inject`.

### L3 · Component (new level)

- Vitest browser mode with the Playwright provider, so components render in real Chromium with MSW, no jsdom.
- Targets: `RideCockpit`, `TerrainPanel`, `OpportunityBoard`, `WindPreview`, `ShelterSettings`, `TargetSettings`, `SegmentSlots`.
- Every component gets one test per state: loading, empty, ready, error, and domain states such as terrain missing, wind missing, calm, night, wet.
- Assertions are accessible: `getByRole`, `toHaveAccessibleName`, and an **ARIA snapshot** per state (`toMatchAriaSnapshot`), committed as YAML beside the test. A layout refactor that changes the accessibility tree is a visible diff.
- axe runs after every component test through a shared fixture; failures at `serious` or `critical` fail the test.

### L4 · Integration

- API: extend `app.inject` suites to cover every route with the recorded fixtures and fault handlers; assert `Cache-Control`, error codes and body limits.
- Database: `testcontainers` Postgres in a CI job runs migrate twice, seed twice, and asserts idempotency (done: `packages/database/src/database.integration.test.ts`, Vitest project `integration`).
- Worker: once it has code, the same pattern with `pg-boss` in the container.

### L5 · End-to-end (Playwright)

**Refactor the 20 journeys into roughly 60 atomic scenarios.** The terrain spec is the exemplar: the current 142-line test becomes seven tests (load, persist across reload, unit switch, mobile layout, invalidate on edit, incomplete data, auto-reload).

Fixtures in `e2e/fixtures.ts`:

- `seed`: navigates to `/health`, writes the given library and rider storage, then opens `/`. Removes the hydration race that was fixed by hand in three specs this week.
- `openMeteo`: installs the shared route handlers with per-test counters and fault switches.
- `clock`: `page.clock.setFixedTime` with a per-test default.
- `a11y`: runs axe after the test body against the final page state, fails on serious or critical, and writes the report to the trace. A rule allowlist file lists known exceptions with an owner and expiry.
- `aria(name)`: asserts an ARIA snapshot of a region against `e2e/__aria__/<name>.yml`.

Configuration:

- `fullyParallel: true`, `workers: 100 %` locally, `retries: 1` in CI with `trace: on-first-retry` and `video: retain-on-failure`.
- Projects: `chromium-desktop`, `chromium-mobile` (Pixel 7 emulation), `webkit-a11y` (the accessibility and keyboard tags only).
- CI shards the chromium projects across four runners and merges reports with `merge-reports`; HTML report and traces are artifacts.
- Tags: `@smoke`, `@a11y`, `@keyboard`, `@mobile`, `@visual`. A flaky test is fixed or deleted, never skipped.

New scenario families:

- **ARIA snapshots** of the cockpit, terrain panel, board and forecast strip in each state.
- **Visual regression** with `toHaveScreenshot` for the dial, compass, legend and both themes, map tiles masked, fixed clock, deterministic fonts. Baselines are generated in CI containers only.
- **Keyboard-only journeys**: draw, save, change hour, switch shelter, load terrain, without a pointer.
- **Fault injection**: one test each for forecast timeout, 429 with retry, elevation partial nulls, tile failure, storage quota exceeded, storage changed in another tab.
- **Clock edge cases**: DST gap, DST overlap, forecast expiry triggering the refresh.
- **Static export smoke**: build `apps/web/out`, serve it under a project base path, and run three `@smoke` tests. The Pages workflow runs this before `deploy-pages`.
- **Privacy gates**: no request leaves the page until the consent box is ticked, for both weather and elevation; assert on the network log.

### L6 · Non-functional

- Lighthouse CI against the static export on every PR: performance, accessibility and best practices at 90 or above, with a budget file for total JavaScript and largest contentful paint.
- `size-limit` on the web client bundle with a hard ceiling and a diff comment on PRs.
- The wind benchmark becomes a `vitest bench` run with a p95 assertion so ranking cannot regress silently.
- `pnpm audit --prod` and `osv-scanner` in CI.

### L7 · Exploratory and test health

- A short charter list per release (not yet written; map drawing, DST, offline, mobile Safari) with findings logged as issues.
- An engineering dashboard from the merged reports (done: `pnpm dashboard` builds `reports/dashboard` from the CI artifacts on main with a 90-run history; Pages publishes it at `/dashboard/`, and `/test-health/` redirects there). Tests per level, slowest ten, flake-free streak, coverage, mutation and type coverage sit beside pipeline, performance, AI practice and delivery sections; see `docs/sdlc.md`.

## 4. Innovative techniques, and why each earns its place

| Technique                         | Where          | What it catches that nothing else does                                         |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| ARIA snapshots                    | L3, L5         | Structural regressions in the accessibility tree without brittle DOM selectors |
| Consumer-driven contract + drift  | L2 advisory    | Provider changes before a user sees "Unavailable"                              |
| Single MSW fixture source         | L1, L3, L5     | Mocks drifting apart between levels                                            |
| Property-based tests              | L1             | Invariant violations across inputs no human would enumerate                    |
| Mutation testing                  | L1 on demand   | Tests that pass without asserting anything meaningful                          |
| axe-per-state fixture             | L3, L5         | Accessibility regressions in states journeys never pause on                    |
| Visual diff with masked tiles     | L5             | Theme and instrument regressions the DOM cannot express                        |
| Fault injection as atomic tests   | L5             | Error-path UX, which is the part users remember                                |
| Static-export smoke before deploy | Pages workflow | Publishing a broken site                                                       |
| Privacy network assertions        | L5             | Requests before consent, which the design forbids                              |
| Test impact analysis              | Local, PR      | Minutes per iteration for developers                                           |

## 5. Pipeline

```text
PR gate (< 5 min)         per PR, slower               deploy (after Checks on main)
├─ static: lint, types,   ├─ testcontainers db         ├─ build:static
│  boundaries, knip,      ├─ OSV scan                  ├─ export smoke @smoke
│  gitleaks, cspell       ├─ live contract drift       ├─ Lighthouse budgets
├─ unit + contract        │  (advisory)                └─ deploy-pages
│  (2 shards, coverage)   └─ dashboard (main only)
├─ component (1 shard)
└─ e2e chromium + webkit  manual: mutation (Stryker)
   (4 shards, merged report)
```

## 6. Milestones

| #   | Milestone                                                                                                                 | Definition of done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Playwright foundations: fixtures, fully parallel config, sharding, report merge, terrain spec split as exemplar           | Done 13 Sep 2026. `e2e/fixtures.ts` provides `seed`, `openMeteo`, `clock`, `a11y` and `aria`; three projects (chromium desktop, Pixel 7, WebKit for `@a11y` and `@keyboard`); four CI shards merged into one HTML report. Terrain is 13 atomic tests, green 3× on 4 workers. The axe-per-test fixture found two real defects on day one: scrollable tables that keyboard users could not reach, and Sunrise accent, gain and loss text below 4.5:1 on glass panels                                                                                                                                                                                                                                                                                                                                                                                                              |
| T2  | Static gates: ESLint plugins, dependency-cruiser, knip, type-coverage, gitleaks, docs formatting                          | Done 13 Sep 2026. `pnpm check:static` is green; the boundary rule found and drove out a real import cycle in `packages/application`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| T3  | Unit depth: coverage gates, fast-check invariants, golden ranking fixtures, Stryker on demand                             | Done 13 Sep 2026 except the database suite (moved to T8). Coverage and mutation thresholds enforced; mutation break ratchets from 80 % toward 85 %                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| T4  | Contract layer: recorded fixtures, `packages/testing` MSW handlers, drift job, storage migrations, API schema snapshots   | Done 13 Sep 2026. `packages/testing` holds recorded Open-Meteo forecast (browser and provider paths), elevation and archive responses validated by new contract schemas; one response builder feeds both msw handlers and the Playwright installer; every e2e spec uses the shared installer; loaders and the provider parse the recordings through real fetch; storage fixtures cover every shape shipped; MCP tool and API route contracts are file snapshots; `pnpm test:contract:drift` runs as an advisory CI job against the live API                                                                                                                                                                                                                                                                                                                                     |
| T5  | Component level: Vitest browser mode, ARIA snapshots and axe per state for the seven components                           | Done 13 Sep 2026. `vitest.config.ts` splits `unit` and `browser` projects; the browser project renders through Playwright Chromium with the app's CSS, a frozen clock and the recorded Open-Meteo msw worker. 45 tests across the seven components, ARIA YAML committed in `__aria__` beside each test, axe on every passing test. First run found the segment carousel unreachable by keyboard while disabled; fixed in source                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| T6  | E2E families: split remaining journeys, add fault, clock, keyboard, privacy and visual suites, mobile and webkit projects | Done 13 Sep 2026. The five remaining journeys (549-line routes spec, attempt, shelter, demo) became 12 files of atomic scenarios; new families: faults (timeout, 429, empty body, tiles, storage quota, unreadable storage), clock (30-minute expiry refresh with a controllable clock, spring DST gap, autumn DST overlap), keyboard-only journeys, privacy (network log: consent gates, allowed hosts only, no referrer or cookies, start point only), visual (`toHaveScreenshot` on the dial, compass, timeline and both demo themes, Linux baselines from the Playwright container, compared only in CI or with `VISUAL=1`). 113 scenarios, average 20 lines; the Open-Meteo stub became automatic after the migration showed one old test reading the live elevation API                                                                                                   |
| T7  | Deploy gate and non-functional: export smoke, Lighthouse, size-limit, bench assertion, audit                              | Done 13 Sep 2026. `pnpm check:deploy` builds the export under `/sprint-scout`, serves it like a Pages project site (`scripts/serve-static.mjs`, gzip), runs the five `@smoke` journeys against it (`playwright.static.config.ts`), gates client JavaScript at 550 kB brotli (`size-limit`) and runs Lighthouse CI with category floors of 0.9, LCP under 2.5 s, TBT under 300 ms and a 650 kB gzip script budget; measured 0.96 to 1.0, LCP 0.7 s, 521 kB. The Pages workflow runs the gate before upload and CI runs it on every push. The wind benchmark became `wind.perf.test.ts` (p95 evaluation under 1 s, ranking under 20 ms) in its own Vitest project. `pnpm audit --prod` joined the static job and found a critical MapLibre advisory, fixed by upgrading to 6.9; OSV scans in CI. The MCP UI CSP test now checks `default-src 'none'` and a hash-only `script-src` |
| T8  | Integration and health: testcontainers, health page                                                                       | Done 14 Sep 2026. Testcontainers suite (4 tests), health page published beside the app, since 10 October 2026 the dashboard at `/dashboard/`. The exit criterion, a week of green runs on main, is now observed rather than built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 7. Conventions

- Test name pattern: `<subject> <behaviour> when <condition>`. No "should", no "and".
- One behaviour per test. If a test needs the word "then", split it.
- Builders over literals: `aRoute({ terrainMode: "terrain" })`, `aForecast({ speeds: [2, 6] })` in `packages/testing`.
- Selectors: role and accessible name first; `data-testid` only for numeric readouts such as `segment-time-value`.
- No shared mutable state between tests; no `test.describe.serial`; no `waitForTimeout` outside a fixture that documents why.
- Every new page state ships with an ARIA snapshot and an axe run.
- A flaky test is fixed the same day or deleted; it is never skipped or retried into green.

## 8. Targets

| Metric                         | Now                        | T4      | T8      |
| ------------------------------ | -------------------------- | ------- | ------- |
| PR gate wall-clock             | not yet measured on GitHub | 8 min   | < 5 min |
| E2E tests / average lines      | 127 / 20                   | 35 / 40 | 60 / 25 |
| Branch coverage, analysis      | 100 % gate                 | 95 %    | 100 %   |
| Mutation score, analysis + app | 80 % break                 | 75 %    | 85 %    |
| Page states with axe + ARIA    | 127 e2e + ~90 component    | 20      | all     |

## MCP suites removed — 22 September 2026

The MCP in-process suite, the stdio tests, the MCP UI browser spec and the CSP test for the MCP UI went with the MCP removal recorded in design.md. The Integration row above now describes only the Fastify inject suite and the testcontainers database suite.

## Flake hunt removed — 23 September 2026

The ×5 smoke hunt, the `e2e/quarantine.json` list read by the Playwright config, the automatic `flaky-test` issues and quarantine pull requests, the non-blocking quarantine job and the advisory Jev triage were all removed. The e2e suite is small enough that a flaky test is a bug to fix on the day, and `retries: 1` in CI with a trace on first retry is the only tolerance. The dashboard keeps the pass count, suite duration trend, slowest ten, coverage and mutation score; the flake rate metric and trend went with the hunt.
