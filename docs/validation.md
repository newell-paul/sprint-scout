<!-- markdownlint-disable MD025 -->

# Milestones 0–1 validation

Date: 2026-09-07. Scope: documented feasibility and demo repository foundation only.

## Changes

- `docs/integration-decisions.md`: official-source review, enabled/disabled matrix, blocked Strava workflow, synthetic fixture provenance and unverified host decision.
- Root workspace/configuration: pnpm lockfile, strict TypeScript, ESLint, Prettier, Vitest, Playwright, CI, local Compose, environment example and setup README.
- `packages/contracts`, `application`, `providers`, `database`, `ui`: bounded Zod contracts, SI/UTC conventions, nullable weather, errors, registered-source policy guards, synthetic routes/effort/weather, local migration/seed and persistent banner.
- `apps/web`, `apps/api`: Next demo page and health route, loopback Fastify health and synthetic segment endpoints. Other package boundaries contain placeholders only.
- Design records foundation decisions; plan records accepted milestones. Existing source documents retained under their uppercase filenames. Next generated its own web-local agent guidance during development.

## Executed checks

Initial dependency installation succeeded from an empty application workspace. Frozen-lockfile installation also succeeded under Node 22. Tests and builds initially passed on the machine's Node 25.8.2; final checks were repeated on Node 22 using the pinned pnpm 10.30.3 runner.

- Lint and formatting: pass.
- Strict type checking, including Next route types: pass.
- Vitest: 18 tests across three files pass. Covers denied, missing, expired and forged source policies; callbacks never execute on denial, including mixed source batches for analysis and AI disclosure; schema validation; nullable weather; synthetic API and health responses.
- API compilation validation and Next production build: pass.
- Playwright Chromium: one desktop/mobile demo smoke test passes.
- PostGIS container: healthy. Migration ran twice; seed ran twice; SQL count remained exactly two synthetic segments. Container stopped after checks; volume retained.

## Limits and resolved environment issues

The sandbox initially blocked npm resolution and Docker socket access; approved retries succeeded. Docker Desktop was initially stopped. Its PostGIS image lacked an ARM manifest, so Compose explicitly uses amd64 emulation. Next reported Rosetta Node execution on Apple Silicon. No timing/performance claims are made. The initial deprecated ESLint 9 dependency was replaced with ESLint 10 and rechecked.

No Git repository existed at this point (initialised 9 October 2026), so there was no commit or diff; CI was configured but had not run on GitHub. No services were purchased or deployed, and no personal accounts or live data providers were accessed. No OAuth or weather secrets were requested or added.

Real Strava processing remains blocked until the exact workflow is verified as permitted. Independent-file permissions and embedded MCP host support remain unverified. These are not demo foundation blockers. No owner authentication exists; the foundation is loopback-only.

Next milestone: 2, directed geometry and deterministic wind engine, including numerical acceptance tests. It has not been started.

# Milestone 2 validation

Date: 2026-09-07. Implemented directed Turf geometry, bounded sampling, meteorological wind projection, weighted metrics, `wind-v1` scoring, configurable caution thresholds, deterministic ranking and a source-gated application service. Files changed: `packages/analysis`, `packages/application`, workspace dependency lockfile, root benchmark script, README, design and implementation plan. No HTTP/MCP tools, weather adapter or ranking UI added.

Checks under Node 22.23.2 / pnpm 10.30.3: lint/formatting, strict type checks, 39 Vitest tests in five files, and API/Next production build passed. The tests cover cardinal directions, signed crosswind, radians, calm/null wind, reversed/curved/weighted routes, duplicates, coordinate bounds, dateline crossing, leg limits, threshold equality, spatial weather gaps, partial failures, AI denial, coverage bounds, source restriction propagation and stable ranking. An initial ranking assertion was corrected because the index saturates at 100 for both 5 and 6 m/s, requiring the earlier-hour tie-break; implementation follows the design. TypeScript narrowing of optional thresholds was fixed before final checks.

Benchmark: Apple M5 Pro, macOS, x64 Node 22.23.2 via Rosetta. Fifty synthetic routes, each 24 sampled legs, across 48 hours (2,400 opportunities). Full evaluation including application validation/policy checks: **160.79 ms**. Twenty cached-row ranking iterations: median **0.48 ms**, maximum **0.69 ms**. This is one local fixture measurement, not a worst-case guarantee or a live-provider benchmark. Cached rows are explicitly held in memory by the benchmark; no persistent cache is introduced.

Remaining limitations: caller adapters must establish spatial weather coverage; coordinate ranges alone cannot detect every swapped longitude/latitude pair. Shelter, terrain and traversal-time changes remain unmodelled; predictions remain unavailable. Live Strava, independent imports and embedded host support remain gated as before. No deployment, services purchased or personal data accessed. No Git repository exists, so no commit was created.

Next milestone: **3 — Open-Meteo adapter and time handling**. Not started.

Milestone 2 final regression checks: Chromium demo smoke test passed (1/1); frozen-lockfile installation passed. Database checks were not repeated because this milestone does not change database code or schema.

# Milestone 3 validation

Completed 8 September 2026. Scope: Open-Meteo adapter and time handling only, plus read-only assessment of the user-linked Strava gateway.

## Changes

- `packages/contracts/src/index.ts`: forecast request/snapshot contracts, freshness/error states and attribution on raw and derived provenance.
- `packages/providers/src/weather.ts`: bounded SI/UTC requests, response normalization, injected transport/clock, batching, 30-minute cache, in-flight deduplication, timeout/retry/cooldown and stale handling.
- `packages/providers/src/weather-fixtures.ts` and `weather.smoke.ts`: authored synthetic payload replay and separate opt-in live smoke command.
- `packages/application/src/time.ts`, `forecast.ts`, `weather-demo.ts`: local-time/DST resolution, deterministic representative sampling, permission checks before requests and raw/derived disclosure, coverage-limited engine joins and fixture-only demo service.
- API `/weather/demo`, small web weather preview and their tests: explicit fixed demo clock, retrieval timestamp, source attribution and honest status. No interactive map/ranking controls.
- Workspace dependencies/lockfile, README, design and integration decisions updated. Original files and prior milestones preserved; the directory still has no Git repository.

## Executed checks

Final checks use Node 22.23.2 and pnpm 10.30.3 on the existing macOS/Rosetta environment.

- Strict TypeScript checks (including Next route generation): pass.
- ESLint and Prettier: pass; final documentation formatting corrected separately.
- Vitest: **66 tests across 8 files pass**. Coverage includes unit normalization, missing columns/nulls, 359/1 directions without averaging, grid metadata, bad units/arrays/times, cache expiry and mutation isolation, request coalescing, timeout/three-attempt limits, Retry-After/cooldown, malformed/oversized responses, denied live coordinates, DST gaps/folds, overnight and fractional-offset zones, sampling radius, per-hour coverage errors and raw/stale metadata AI-disclosure denial.
- API type build and Next production build: pass.
- Playwright Chromium: **2 tests pass**, including mobile layout and synthetic weather attribution/status.
- Frozen-lockfile installation: pass.
- `pnpm test:weather:live`: successful default skip. The live flag was not enabled; no real forecast downloaded. Live endpoint behavior remains unverified.

No database changes, so migration/seed checks were not repeated. No deployment, paid provisioning, gateway execution, OAuth flow or personal-account access occurred. CI remains entirely fixture-based and has not been run on GitHub.

## Findings and limits

The free Open-Meteo weather-data decision is recorded separately from Strava permissions. Live transport is disabled by default and restricted to the invented demo region when explicitly enabled. Freshness is distinct from valid-hour coverage. Stale data keep original retrieval times and errors but are excluded from ranking; no synthetic fallback occurs on live failure. The 1 km representative-point setting is a sampling heuristic, not a model-resolution claim. Cache/concurrency limits are instance-local. No performance or safety claims were added.

The user-linked gateway was reviewed at commit `7cd1c2820d3f9d97b04957d1d378aff0e01675da` without executing it. It relays official MCP, but its own documentation leaves the live flow unverified and acknowledges token-isolation nonconformance. Required segment capabilities, exact workflow permission and owner-only operation are unresolved. See [integration decisions](integration-decisions.md).

Next milestone: **4 — Standalone visual MVP**. Not started.

# Milestone 4 validation

Completed 8 September 2026. Scope: standalone visual demo only.

The homepage now has local date/window/zone and route controls, ranked cards, a directed MapLibre map with coloured legs and wind arrows, a supplied-hour slider, ECharts comparison, accessible hourly/route tables, explicit departure durations and light/dark themes. A shared bounded planner service serves both Next and Fastify adapters. All weather and geometry are authored synthetic fixtures; the planner clock is 2026-09-08T12:00:00Z with 8–9 September coverage. The legacy `/weather/demo` fixture remains unchanged. No external tiles or live weather are fetched.

## Executed checks

- ESLint and Prettier: pass.
- Strict TypeScript, Next route types, API compilation and Next production build: pass under Node 22 / pnpm 10.30.3.
- Vitest: **72 tests across 9 files pass**. New coverage checks bounded planner responses, matching measurements, absolute-hour consistency across overlapping queries, empty/out-of-coverage results, incomplete weather, partial geometry failure, stale weather, rejected route IDs/DST input and departure bounds/midnight arithmetic.
- Playwright Chromium: **6 tests pass**. Covers matching selected UTC instants across card/map/chart/table, no planner requests during slider movement, preserved segment selection across window changes, table selection, departure changes, empty selection, missing fields, partial failure, stale/outage states, retry, loading and retained previous results on network failure, keyboard interaction and DST-gap rejection.
- Axe WCAG 2 A/AA and 2.1 AA checks: no detected violations on tested desktop light and mobile dark views. Mobile test forces WebGL failure and reduced motion, checks table availability and absence of page overflow. Automated checks do not certify full accessibility.
- Desktop and mobile full-page screenshots were visually inspected: `test-results/milestone4-desktop.png` and `test-results/milestone4-mobile-dark.png`. These generated local artifacts are ignored and may be replaced by subsequent test runs.

Initial checks found a strict DTO rejection of an extra timezone field, an invalid chart ARIA label and dark map-retry contrast; these were fixed before successful reruns. Browser selectors were scoped to distinguish application messages from Next's route announcer. Map rendering and the chart were inspected in the desktop screenshot; fallback tables and stacked mobile controls were inspected in the dark mobile screenshot.

## Limits and next step

No milestone 5 implementation, database/schema change, deployment, purchase, OAuth flow or personal-account access occurred. The project remains loopback-only and unauthenticated. Strava permission and gateway capabilities remain blocked as documented; no gateway was executed. Real weather behavior, licensed map tiles and embedded host support remain unverified. There are no remaining blockers for this synthetic visual milestone. Node runs through Rosetta on this machine, with Next's existing advisory; no new performance claims are made. No Git repository exists, so no commit was created.

Next: **Milestone 5 — MCP tools, embedded app and skill**. Not started; host support must be verified there before promising an embedded experience.

# Milestone 5 implementation and local validation

Date: 8 September 2026. **Implementation was ready; host acceptance stayed open until milestone 5 was withdrawn on 22 September 2026.** No host choice or actual prompt-to-view run has been recorded. The local test harness is not a substitute for that acceptance criterion.

## Changes

- `apps/mcp`: five bounded read-only tools, official SDK v2 stdio server, typed success/error output, text fallback and registered HTML resource. Stdio accepts both legacy and modern negotiation and caps input buffering at 16 KiB. It has no HTTP listener or configurable live provider.
- `packages/application`: owner-scoped demo use cases and shared conditions presentation. Web/API and MCP call the same deterministic forecast/ranking service. Source analysis, derived-output and AI-disclosure checks precede access, and denied weather metadata never enters text, structured data or UI metadata.
- `packages/contracts`: versioned MCP inputs/outputs, bounded identifiers/ranges, provenance and embedded response validation. History remains explicitly unavailable; departure reuses the existing UTC function.
- `packages/ui`: map/chart moved into shared browser-safe subpaths, with thin Next client re-exports preserving the standalone demo.
- `apps/mcp-ui`: self-contained React resource, official Apps SDK bridge, validated inbound state, cached hour selection, host-mediated refresh, source/freshness labels, map/table fallback and light/dark/reduced-motion behavior. Final HTML is about 3.1 MB and contains all local assets. Its hashed-script CSP and host resource metadata deny external networking.
- `skills/sprint-scout/SKILL.md`: repository-owned orchestration instructions and example prompts, including fixed-date coverage, unavailable history, explicit duration assumptions and refused Strava flows. No global skill installation or desktop configuration mutation.
- Setup and acceptance guide in `docs/mcp.md` (removed 22 September 2026), plus README/design/plan/integration status and workspace scripts/lockfile.

## Executed checks

Checks use Node 22.23.2 and pnpm 10.30.3 on the existing macOS/Rosetta environment.

- Frozen-lockfile installation: pass.
- ESLint/Prettier and strict TypeScript, including Next route generation: pass.
- API compilation, Next production build and standalone embedded-resource build: pass.
- Vitest: **84 tests across 11 files pass**. Includes all prior calculation/provider regressions plus tool schemas, pagination/filtering, shared web/MCP numerical parity, unavailable history, UTC departure, invalid owner/IDs/zones/windows, denied analysis/derived/AI permissions before provider calls, Strava provenance denial, denied weather metadata suppression, coverage failures and bounded/inconsistent embedded payload rejection.
- Actual stdio checks use the official SDK client in both legacy and automatic modern negotiation modes. They launch from a temporary working directory with absolute loader/entry paths, confirming the documented invocation does not depend on the host's current directory.
- Playwright Chromium: **10 tests pass**, comprising six standalone web regressions and four embedded AppBridge scenarios. The app resource and initial data come from the actual stdio server. They check synchronized views and request counts, host-mediated refresh, separate-origin parent-DOM isolation, blocked fetch, invalid host payload recovery, HTML-like names as text, mobile WebGL failure/table fallback, reduced motion, scoped tool-call rejection and message-source isolation.
- Desktop and mobile embedded screenshots were visually inspected: `test-results/milestone5-embedded.png` and `test-results/milestone5-embedded-mobile.png`. They show the rendered map/chart and the mobile fallback respectively; generated artifacts may be replaced by future test runs.
- Axe WCAG 2 A/AA and 2.1 AA checks detect no violations in the tested embedded desktop-light and mobile-dark views. This is automated coverage, not an accessibility certification.
- Skill-creator `quick_validate.py`: pass. Its initially missing PyYAML dependency was installed in an isolated temporary virtual environment; neither system Python nor project dependencies were changed for that validator. Tool example arguments and date/UTC behavior were checked against the implemented contracts; no claim of a live model skill run is made.

Initial checks found a missing shared map stylesheet import and a type-only SDK import mismatch; both were fixed. The extra protocol browser test initially conflated the app request tracker's response to a deliberately raw request with message-source isolation. The host correctly denied that call; the test now restores valid state before independently checking unrelated-window messages. No server access check was weakened.

## Remaining acceptance and boundaries

The named tested host is **SprintScout AppBridge test host 0.5.0**, a Playwright harness using the official SDK. It contains no language model. A chosen conversational desktop host must still run the documented example prompt and demonstrate actual embedded rendering/interaction, permissions and fallback. Host configurations and personal accounts were not accessed or changed.

The web fallback is a local synthetic demo. An authenticated remote link is unavailable until milestone 7; the plan/design explicitly record that sequencing limitation. Real Strava access and the user-linked gateway remain disabled pending source/workflow verification. Live weather was not enabled, no database work or migration was needed, no services were purchased and nothing was deployed. No milestone 6 or later implementation began. The directory still has no Git repository, so no commit was created.

Next action at the time: select and verify the conversational desktop host to finish milestone 5 acceptance (superseded by the 22 September 2026 withdrawal). The next implementation milestone is 6 (approved personal data integration), which remains separately gated by source-specific permission.

## Independent route drawing — 9 September 2026

Node 22 / pnpm 10.30.3: lint and type checking passed; 87 unit tests across 12 files and 11 Chromium browser tests passed. New coverage exercises storage bounds/corruption/consent/degenerate geometry and coordinate entry, reverse, save, reload, undo, clear and deletion. Browser tests intercept OpenStreetMap tiles; live tiles and manual touch drawing were not validated. Saved-route wind comparison was unimplemented at this point and is delivered in the following entry. No Strava access or deployment occurred.

## Same-page wind overlay — 9 September 2026

Node 22 / pnpm 10.30.3: 91 unit tests in 13 files and all 12 Chromium browser tests passed. Lint, workspace/Next type checks and production build passed. New checks cover from-to direction conversion, calm/missing hours, invalid units/values, consent before network, bounded hourly requests, rate-limit failures, the visible transparent arrow's rotation/speed, 48-hour slider without refetch, failed refresh clearing overlays, and deletion. Weather responses and tiles are mocked; live provider availability and accuracy were not tested. Outside CI, browser tests reuse a dev server already running on port 3000 and otherwise start their own; CI always starts its own. No user browser storage is touched by test contexts.

## Simplified primary interface — 9 September 2026

The home page now opens the personal segment map, and `/routes` redirects to it. Verified desktop/mobile screenshots, preserved saved routes, automatic selection, save-to-view transition, collapsed advanced controls, and the transparent arrow/slider. Full 12-browser-test suite passed after moving synthetic regression cases to `/demo`; the final route-only rerun covers automatic tile loading and a fix keeping map-failure messages separate from save confirmation. All 91 unit tests, lint, type checks and production build passed. Tile/weather responses remain mocked; no live provider accuracy claim is made. MCP synthetic fallback links now target `/demo`.

Wind streak visual refinement: replaced the arrow with a bounded set of 38 translucent SVG trails moving in the forecast flow direction. Speeds remain numeric and animation speed is illustrative. Reduced-motion preference renders static trails. Type checking and focused lint passed; browser checks cover direction, animation/reduced motion and missing-hour cleanup using synthetic weather.

Wind particle refinement: replaced the SVG trails with a canvas particle field in the style of zoom.earth wind maps: seeded random spawn, bounded count by map area, fading trails, and drift speed scaled to forecast wind (capped). Reduced-motion preference draws one static frame. Unit tests cover direction, speed scaling, count bounds and seeded determinism; the browser test checks direction/speed attributes, reduced-motion mode and missing-hour cleanup.

Dark theme: the segment screen now uses root colour tokens that follow the system preference, with a persisted Light/Dark toggle applied before paint. Map tiles keep their native colours in both themes (only the empty-map background follows the theme); the wind particles carry a dark halo so white trails stay legible over street tiles without a veil. The demo planner keeps its own toggle. Browser test covers system preference, toggle, persistence across reload and body colour in both themes.

## Reference-rider ride effect — 9 September 2026

Added `ride-effect-v1` in `@scout/analysis`: a constant-power balance model for a reference rider holding 40 km/h in calm air (CdA 0.36, Crr 0.005, 85 kg, flat road; power derived from that speed), solved per leg by bisection and combined by time, with the 10 m forecast wind scaled to handlebar height by a logarithmic profile (factor ≈ 0.67). Exposed as `rideEffect` on every planner hour and computed client-side for drawn segments from the point forecast. UI shows a signed km/h delta labelled "for an average ride" with the calm pace, colour plus text. Unit tests cover calm baseline, sign, time asymmetry, time weighting, clamping, a fixed reference value and invalid input; browser tests check the indicator on the segment screen and demo planner and its removal for missing hours. design.md records the model and its limits. It is not a personal prediction; `prediction` stays null.

Dark-only theme and slider: the light theme and toggle were removed at the owner's request; root tokens are now fixed dark. The 48-hour slider is custom-styled with tick marks every 6 hours, heavier midnight delimiters labelled with the weekday and date, and a larger keyboard-focusable thumb. Logo is an inline themed SVG. Browser test checks two midnight ticks in the mocked 48-hour window.

Confidence band and weather symbols: ride effect now carries a likely range from a lead-time-dependent forecast error heuristic (documented in design.md), shown as a bar and text on the segment screen and as a bar in the demo planner. The segment forecast request adds `weather_code` and `is_day`; a WMO-code icon with an accessible label appears beside the selected hour. Unit tests cover band widening with lead time and wind angle, absence without lead, optional column parsing and request parameters; browser tests check band presence and icon kinds for mocked codes.

Automatic wind loading: the Show/Refresh wind button was removed at the owner's request. The forecast loads when a segment is selected, re-fetches itself when the 30-minute freshness window lapses (keeping the selected hour), and offers a Try again action only on failure. The weather-source note still states that the segment start location is sent to Open-Meteo. Browser test updated to expect one request on load and the failure state after a reload with a mocked outage.

Five segment slots: the route dropdown and management section were replaced by five slot buttons (teal when defined, pale when empty, ring on the active slot). Clicking a defined slot views it; an empty slot opens drawing for that slot. Filled slots offer Redraw (loads a copy and clears the slot until saved) and Delete. Storage now records a slot per route with migration for earlier saves; the library is bounded to five. Unit tests cover slot bounds, duplicates and migration; browser tests cover slot state after save, redraw, delete and reload.
