# Personal Segment & Wind Planner — Implementation Plan

Status: milestones 0–4 complete; milestone 5 (MCP host) withdrawn 22 September 2026; milestone 6 delivered as the browser-only independent-route slice with GPX efforts and archive wind; Strava integration blocked; the synthetic demo, its API and database removed 24 October 2026. Open checklist items below are marked done or dropped as of 9 October 2026.
Prepared: 7 September 2026.
Specification: [design.md](design.md).

## Instructions to the implementing agent

Read this file and `docs/design.md` before coding. Follow repository `AGENTS.md` if present. This plan authorizes implementation in the target repository, not account creation, paid subscriptions, external approvals, public deployment, or access to personal accounts.

Work one milestone at a time. At each milestone report changed files, executed checks and results, remaining risks, and the next milestone. Do not report mocked behaviour as a working integration. Update these checkboxes only after acceptance checks pass. Record justified changes to the design; do not silently substitute architecture or enable gated data paths.

Use synthetic fixtures until a source-specific usage decision permits real data. Do not ask for credentials in chat or commit them. Missing real credentials does not block demo work.

## Milestone 0 — Feasibility and source boundaries

- [x] Inspect repository instructions, existing code and uncommitted changes; preserve unrelated work.
- [x] Read the current official sources linked in the design; record dates and applicable sections in `docs/integration-decisions.md`.
- [x] Build a capability/permission matrix covering geometry, history, analytics, storage, derived outputs and AI disclosure for each proposed source.
- [x] Investigate official Strava MCP availability and segment capabilities using advertised documentation; do not assume a custom REST wrapper has the same permission.
- [x] Record any exact workflow requiring approval as blocked. Do not contact third parties without user authorization.
- [x] Choose demo mode as the default. Create synthetic routes, not downloaded Strava examples.
- [x] Identify the intended MCP host if known; otherwise record embedded UI as unverified and retain web fallback.

Deliverables: integration decision log, explicit enabled/disabled capability list, documented fixture provenance.

Acceptance: no implementation task requires prohibited or uncertain real-data use. If live integration remains blocked, continue milestones 1–5 in demo mode. The gate blocks the affected feature, not the entire prototype.

## Milestone 1 — Repository foundation and contracts

Dependencies: milestone 0 demo boundary established.

- [x] Create the pnpm TypeScript workspace described in the design; keep package boundaries small.
- [x] Select compatible stable dependency versions and commit the lockfile; document Node version.
- [x] Configure strict TypeScript, linting, formatting, Vitest and CI checks.
- [x] Add Docker Compose for local PostgreSQL/PostGIS; use development-only values, not production credentials.
- [x] Define shared Zod contracts, SI units, UTC instants, source policies, nullable weather fields and error codes.
- [x] Implement source-policy checks in the shared application layer with deny-by-default tests.
- [x] Scaffold the Next.js app and Fastify API; add a persistent demo banner and health endpoints.
- [x] Add `.env.example` with placeholders and a README with setup commands.

Required scripts: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, plus documented database migration and demo-seed commands. Make scripts functional before documenting them as available.

Acceptance: clean installation, migration, build and test succeed without external credentials. An unauthorized source cannot reach analysis or AI output. CI contains no live-provider dependency.

Validation for milestones 0–1: see [validation.md](validation.md). Lockfile generated; the Git repository was initialised on 9 October 2026.

## Milestone 2 — Directed geometry and wind engine

Dependencies: contracts and fixtures.

- [x] Implement geometry validation, duplicate removal, leg sampling, distance and bearing.
- [x] Implement meteorological from-direction conversion and vector projection.
- [x] Implement weighted segment statistics and the versioned `wind-v1` index.
- [x] Implement filtering, caution grouping, deterministic tie-breaking and best-hour-per-segment selection.
- [x] Return per-segment errors for missing geometry/weather; never replace missing wind with calm.
- [x] Bound segment count, point count and hourly range; establish a cached ranking benchmark.

Required numerical tests (tolerance documented):

| Fixture                                           | Expected result                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| Northbound; wind from south at 5 m/s              | Tailwind +5 m/s, crosswind 0                                     |
| Northbound; wind from north at 5 m/s              | Tailwind -5 m/s, crosswind 0                                     |
| Eastbound; wind from north at 5 m/s               | Tailwind 0, absolute crosswind 5 m/s                             |
| Equal northbound/southbound legs; wind from south | Mean tailwind near 0; individual legs retain opposite signs      |
| Calm wind with undefined direction                | Zero components, no NaN                                          |
| Duplicate-only line                               | Geometry error                                                   |
| Missing wind speed                                | Opportunity excluded with an explicit error                      |
| Curved line                                       | Per-leg calculation differs appropriately from endpoint shortcut |

Also test degrees/radians, longitude/latitude order, length weighting, null optional fields, stable sort, threshold boundaries and reverse route direction.

Acceptance: the package is pure and requires no network, database or model call. Known synthetic examples match hand calculations. Every output identifies algorithm version.

Validation: see the Milestone 2 section of [validation.md](validation.md). All checks passed; milestones 3 and 4 followed.

## Milestone 3 — Open-Meteo adapter and time handling

Dependencies: engine and contracts.

- [x] Implement provider interface and bounded forecast requests for documented hourly fields.
- [x] Normalize returned units, coordinates, UTC valid times and missing values.
- [x] Add representative spatial sampling, batching and 30-minute request caching.
- [x] Add timeouts, bounded retry with backoff/jitter, rate-limit handling and stale-data status.
- [x] Preserve retrieval timestamps and provider metadata without inventing issue times.
- [x] Implement local date/window resolution using IANA zones; handle DST gaps and repeated hours.
- [x] Restrict analysis to forecast coverage and refuse silent extrapolation.
- [x] Add an opt-in live smoke test using demo coordinates; normal tests replay synthetic provider fixtures.

Acceptance: two identical requests reuse the cache; failures surface a visible unavailable/stale state. Date boundaries and DST round-trip correctly. Wind from 359°/1° is never averaged arithmetically if interpolation is implemented. Forecast attribution appears in API/UI data.

Validation: see the Milestone 3 section of [validation.md](validation.md). Live smoke remains opt-in and was not executed; normal checks passed with synthetic fixtures.

## Milestone 4 — Standalone visual MVP

Dependencies: wind engine and weather adapter.

- [x] Build date, attempt-window and time-zone controls.
- [x] Build the ranked segment cards with metrics, index label, warnings and freshness.
- [x] Render directed segment geometry and wind-flow arrows with MapLibre.
- [x] Add per-leg colouring, clear legends, selected-segment state and hourly slider.
- [x] Add ECharts hourly comparison and accessible table fallback.
- [x] Show unavailable personal history and prediction fields honestly.
- [x] Add departure estimation from explicit approach/warm-up durations.
- [x] Handle empty selection, missing forecast, partial batch failure and retry.
- [x] Test mobile and desktop layouts, keyboard navigation, reduced motion and contrast.

Acceptance: map, chart, table and cards reflect the same selected instant and analysis response. Moving the slider uses cached results without one upstream request per movement. Demo mode is unmistakable. App remains usable if maps or tiles fail.

Validation: Milestone 4 completed 8 September 2026; see [validation.md](validation.md). Synthetic-only standalone demo, with no external map tiles or live provider requests. Milestone 5 implementation follows below.

## Milestone 5 — MCP tools, embedded app and skill

Dependencies: shared services and working web view.

- [x] Implement the five initial tools listed in the design using the official SDK and shared schemas.
- [x] Enforce ownership, limits, policy and AI-disclosure checks before returning data.
- [x] Add local stdio transport for a supported local client; reserve remote transport for the authentication milestone.
- [x] Test tool schemas, successful calls, denied sources and structured errors in an MCP test client.
- [x] Build a minimal MCP App resource for one selected segment and its hourly conditions.
- [x] Dropped (withdrawn with milestone 5 on 22 September 2026): Validate the chosen conversational host end to end. Local AppBridge sandbox, content-security policy, map assets and approved UI-to-tool interactions are tested; actual desktop prompt-to-view acceptance remains pending.
- [x] Reuse presentation components without assuming all Next.js server features work in an embedded resource.
- [x] Write the dedicated orchestration skill with example prompts and explicit fallback behaviour.
- [x] Keep all real Strava paths disabled unless milestone 0 specifically allows them.

Acceptance: in a named tested host, a prompt can rank synthetic/permitted segments and open a working visual view. If the host lacks MCP Apps, a text/table and authenticated web fallback work. A malicious segment name cannot become an instruction or executable HTML. No model performs the numeric scoring.

Release checkpoint: the demo MVP is now useful and can be handed over even if live Strava integration is unresolved.

Implementation status (8 September 2026): tools, stdio, embedded resource and skill implemented and locally tested; **milestone acceptance remained open** for the chosen conversational desktop host until the 22 September 2026 withdrawal. The MCP guide was removed with the server on 22 September 2026; see the Milestone 5 section of [validation.md](validation.md). No desktop settings were changed. The fallback is explicitly local/synthetic; authenticated remote access remains milestone 7. Do not start milestone 6 to work around this acceptance item or the source-permission gate.

Removed (22 September 2026): the owner chose to keep Sprint Scout as a focused web app. `apps/mcp`, `apps/mcp-ui`, `skills/sprint-scout`, `docs/mcp.md` and the MCP tool contracts were deleted; milestone 5 is closed as withdrawn, not accepted. Remote MCP items in milestone 7 no longer apply.

## Milestone 6 — Approved personal data integration

Dependencies: explicit source-specific milestone 0 approval. Skip blocked providers; do not create workarounds.

- [x] Done (Open-Meteo personal profile, browser loaders): Implement only the permitted provider mode and supported capabilities.
- [x] Done (GPX import bounds and own-recording confirmation; drawn-route validation): For independent files, validate provenance confirmation, file size, point count, coordinate format and directed geometry.
- [x] Dropped (Strava worker blocked, 22 September 2026): For an approved direct OAuth integration, implement state validation, encrypted tokens and serialized refresh rotation.
- [x] Dropped (Strava worker blocked, 22 September 2026): Verify actual endpoint/scopes/subscription behaviour with the owner's authorized account.
- [x] Dropped (Strava worker blocked, 22 September 2026): Bound imports and pagination, enforce retention, and deduplicate jobs.
- [x] Dropped (Strava worker blocked, 22 September 2026): If permitted, add relevant webhook verification/handling and deletion events.
- [x] Dropped (Strava worker blocked, 22 September 2026): Implement disconnect and deletion across source records, derivatives, caches and pending jobs.
- [x] Dropped (Strava worker blocked, 22 September 2026): Prevent stale in-flight work from restoring deleted data using connection-generation checks.
- [x] Done (efforts panel shows the best recorded time and the sample count): Display the observed-history best, sample count and coverage without claiming lifetime completeness.

Acceptance: real data is accessed only through the documented allowed path; unsupported capabilities return an explicit reason. Revocation, refresh races, rate limits, duplicate events and deletion are tested. No restricted data enters model context, logs, fixtures or persistent stores.

## Milestone 7 — Private operation and release hardening

Dependencies: selected release mode and user-approved hosting choice.

- [ ] Implement single-owner login, authorization, secure sessions and CSRF protection.
- [x] Dropped (no remote MCP (withdrawn with milestone 5 on 22 September 2026)): For remote MCP, implement the selected host's supported authorization flow; reject invalid audience/origin and unauthenticated calls.
- [x] Done for dependency scanning (`pnpm audit --prod` and OSV in CI); HTTPS, secrets and map keys do not apply to the static site: Configure HTTPS, secrets, restricted map keys, request limits and dependency scanning.
- [ ] Add expiry/cleanup jobs and privacy-preserving logs and metrics.
- [ ] Document backup/restore and source-specific deletion/retention behaviour; test no resurrection of deleted records.
- [x] Done (validation.md milestone 4 figures; `wind.perf.test.ts` p95 budgets in CI): Measure cached ranking performance on 50 segments over 48 hours; record hardware and result.
- [ ] Run complete build, unit, integration and browser checks; manually inspect desktop/mobile views.
- [ ] Document setup, disconnect, recovery, provider failures and known limitations.
- [ ] Obtain explicit approval before paid provisioning or external deployment.

Acceptance: only the owner can access data; secrets are absent from bundles/logs; expiry and deletion work; failures do not produce fabricated forecasts. Release notes clearly identify demo vs real provider capabilities and tested MCP host (withdrawn with milestone 5 on 22 September 2026).

## Milestone 8 — Optional validated predictions and ride planning

Not part of MVP; requires a separate go/no-go decision.

- [ ] Verify permission for every training/evaluation/analysis input and intended model type.
- [ ] Define eligible efforts, equipment categories, exclusions, minimum sample requirements and target quantity.
- [ ] Establish a simple baseline and chronological held-out evaluation; prevent future-data leakage.
- [ ] Distinguish archived forecasts available at prediction time from retrospective weather observations.
- [ ] Report prediction error and empirical interval coverage; keep prediction unavailable if evidence is insufficient.
- [ ] Introduce PR probabilities only after probability calibration is demonstrated and documented.
- [ ] Integrate a licensed cycling routing provider if true approach-time planning is requested.
- [ ] Add opt-in notifications only with explicit user scheduling and delivery consent.

Acceptance: predictions materially improve on the documented baseline on held-out data and disclose limitations. Weather-only ranking remains independently usable.

## End-to-end release scenarios

1. Select two synthetic segments and a covered window; web and MCP return identical ordering and numerical metrics. (withdrawn with milestone 5 on 22 September 2026)
2. Reverse one segment; wind signs update correctly.
3. Change time zone across a DST transition; underlying instants remain correct and local labels are unambiguous.
4. Simulate provider outage; show an error or clearly dated stale forecast, not fabricated current data.
5. Deny a source's AI permission; no raw or derived source content reaches MCP output. (withdrawn with milestone 5 on 22 September 2026)
6. Disconnect a real permitted source while refresh is in flight; no data reappears.
7. Open the app without authentication outside loopback; access is denied.
8. Use a host without embedded UI support; a usable fallback remains. (withdrawn with milestone 5 on 22 September 2026)
9. Request a prediction without eligible history; return null and a reason, not an invented percentage.

### Authorized independent drawing slice — 9 September 2026

The owner explicitly requested drawing independent routes and confirmed implementation. This authorizes this bounded Milestone 6 slice despite the outstanding Milestone 5 desktop-host check; it does not authorize additional providers or remaining milestones.

- [x] Browser-local directed route drawing, naming, undo, clear and reverse.
- [x] Explicit independent-source/local-processing confirmation; bounded validated storage; reopen and delete.
- [x] Optional attributed OpenStreetMap basemap; keyboard coordinate entry fallback.
- [x] Done (opportunity board, see below): Connect saved independent routes to permitted weather comparison.

Milestone 6 remains incomplete. Strava access stays disabled; no OAuth, imports, external deployment or paid services are enabled. Milestone 5's conversational-host acceptance remained open until the 22 September 2026 withdrawal.

### Independent wind overlay — 9 September 2026

Owner authorized extending the same Milestone 6 independent-route slice: select a saved route on `/routes`, explicitly load a personal-use Open-Meteo forecast, and slide 48 hourly instants to update one transparent wind arrow and speed label. This implements a start-location wind preview, not full spatial weather comparison/ranking. The comparison checkbox above remained open until the 22 September 2026 withdrawal of milestone 5 for that broader feature. Milestone 5 host acceptance and other Milestone 6 provider work remain outstanding; no later milestones started.

Same Milestone 6 slice: simplified the primary personal interface after owner feedback. `/` shows the saved segment/map/wind flow; `/routes` redirects there. Advanced drawing, management and source information are collapsed. The synthetic planner remains an unlinked `/demo` regression/fallback page. No new integration or milestone was introduced.

### Editing and forecast usability — 10 September 2026

Owner authorized prioritising safe editing, the mobile layout and timeline usability within this same slice. Implementation preserves saved routes during edits, adds Cancel and session-local deletion undo, compacts the mobile map/header, and adds hourly navigation, local-day shortcuts and a modelled-effect comparison using the existing calculations. Broader Milestone 6 comparison work and Milestone 5 conversational-host acceptance remained open until the 22 September 2026 withdrawal of milestone 5.

The owner subsequently authorized the remaining review items in this slice: named segment controls, explicit Add segment slots, consistent display units and route-relative wind labels, subdued tiles and clearer route/flow markings, particle controls, reference-model/estimated-range copy, and guided drawing. Numerical models, providers and remaining milestone gates are unchanged. Validation includes deterministic direction/unit tests and desktop/mobile browser flows with mocked weather.

The owner also requested a segment-time badge at a 40 km/h still-air baseline. This extends the same slice's existing reference model presentation with wind-adjusted time, still-air time, difference and an estimated range. It does not start milestone 8's trained/validated personal predictions. Numerical tests cover still air, headwind/tailwind, mixed legs and missing inputs; browser checks cover hourly updates and unit-independent elapsed time.

The owner authorized removing the five-segment cap within the same independent-route slice. The library grows within its existing storage/geometry bounds, retaining existing records and exposing horizontal scrolling controls. Validation covers larger libraries, free-slot reuse, and saving/reloading/selecting a sixth segment on mobile. No further milestone or integration is started.

Owner approved a cockpit-style redesign within this slice: a speedometer, unified time estimate and wind compass, plus one interactive hourly time chart. Assumptions are consolidated, and segment distance and best-window improvement use existing model outputs. Browser coverage verifies missing readings, keyboard/click/table selection, unit changes and mobile layout without new forecast requests. This is presentation work, not a new model or integration milestone.

### Independent-route quick wins — 10 September 2026

Owner requested "quick win" features from a product review and approved implementing them together within the same independent-route slice: owner rider inputs (power, mass, CdA) feeding the existing ride model; night and precipitation bands on the 48-hour chart with an optional dry-daylight best-hour preference; and an on-demand opportunity board ranking every saved segment by time gained at its best hour with sparklines and one-click opening. A wind-along-route ribbon was built and then removed the same day at the owner's request. Design section 9 and a new decisions section record the model extension and presentation rules.

Validation: unit tests for rider derivation and bounds, condition bands and best-hour filtering, board ranking and ordering; one Playwright flow covering rider persistence and reset, band positions, filtered best hour, board ranking across two segments with request counting, board-to-cockpit navigation and the mobile width. Milestone 5 host acceptance (withdrawn 22 September 2026) and the remaining Milestone 6 comparison work were unchanged; no provider, transport or Strava gate was touched.

### Attempt-planning slice — 11 September 2026

Owner authorized implementing segment targets, availability and compact conditions together within the existing independent-route slice. Targets use the validated browser library; availability applies to cockpit and board without changing unrestricted inspection; the existing weather adapter requests additional documented hourly conditions. Terrain-aware modelling was the next credibility investment (delivered in the following entry), with prerequisites and validation gates recorded in design.md, not a shipped personal-prediction feature. Milestone 5 host acceptance and remaining Milestone 6 work remain open.

Acceptance checks: legacy-library compatibility; target save/reload/removal and unavailable comparison; inclusive/exclusive availability boundaries, overnight/DST and uncovered windows; consistent cockpit/board filtering; valid units, missing optional weather and crosswind geometry; desktop/mobile browser interaction without additional requests when changing filters or units.

Validation: 137 unit tests and six Chromium browser flows passed, including the new attempt-planning flow and all independent-route regressions. Lint/format and strict type checks passed. Browser weather was mocked; no real-provider accuracy or iOS Safari validation is claimed. Terrain modelling was planned at this point and is delivered in the following entry.

### Authorized terrain-aware extension — 11 September 2026

The owner subsequently authorized implementing terrain-aware modelling. This stays within the independent-route slice; no trained personal predictions, Strava integration, new hosting or full later milestone begins. The former terrain planning item is superseded by design.md's authorized terrain-aware specification and the new source decision.

- Opt-in elevation loading with bounded sequential requests, timeout, response validation, attribution and separate location-sharing disclosure.
- Versioned raw profile storage bound to directed geometry; edits invalidate elevation, removal returns explicitly to flat mode, and deletion/late responses cannot restore data.
- Uniform sampling, deterministic smoothing, elevation graph and accessible raw/model sample table.
- Grade-aware constant-power model with gravity, grade-adjusted rolling resistance and unique-root descent handling. Same-terrain calm baseline and wind-only range; no implicit coasting, braking or acceleration model.
- Consistent terrain/flat selection across target comparison, cockpit, chart and opportunity board; missing terrain remains unavailable in terrain mode.

Validation includes flat-road equivalence, climbs/descents, rolling and reversed terrain, energy balance, sub-tailwind solutions, model-domain limits, noise/missing elevation, consent/batching/abort failures, storage compatibility, board consistency, reload/edit invalidation and desktop/mobile browser flows. Held-out performance validation and actual iPhone Safari checks remain outstanding, independently of this implementation.

Validation completed: 150 unit tests, eight Chromium browser flows, lint/format and strict type checks passed. Desktop and 390 px mobile screenshots were inspected using synthetic weather/elevation. No live elevation request or real-effort accuracy validation was performed. Existing milestone acceptance gates remain open.

### Manual shelter extension — 11 September 2026

Owner authorized a per-segment manual shelter selector with icons and Exposed/Sheltered/Dense choices. This remains a scenario-based extension to the same independent-route slice, not validated shelter simulation or a new data provider. Preserve forecast/gust readings, apply deterministic reductions only to performance modelling, display an exposed comparison and retain an envelope spanning both scenarios. Persist and validate choices without changing old libraries. Test headwind/tailwind behaviour in both terrain and flat modes, missing data, unchanged inputs, cockpit/board consistency, keyboard/mobile interaction and persistence.

Validation: 155 unit tests, the eight existing segment/attempt/terrain browser flows and the new shelter flow passed. Lint/format and strict type checks passed. The new flow verifies unchanged forecast/gust text and request count, per-segment persistence, board navigation, keyboard activation and 390 px layout. Weather is mocked; shelter factors are explicitly uncalibrated scenario assumptions, not validated tree protection.

### Recorded efforts and GPX import — 13 September 2026

Scope: a deterministic effort matcher in `@scout/analysis` (`effort-match-v1`), a bounded GPX reader in `@scout/application`, an efforts panel on the segment screen with local file import, per-segment storage keyed to geometry, and atomic browser journeys on the Playwright fixtures. Out of scope: any network import, Strava credentials, weather for past efforts. Validation: 12 matcher tests including fast-check invariants (timing within one sample interval, timestamp-shift invariance, bounded noise, no reversed matches, determinism), 5 reader tests, library validation tests, and 8 atomic journeys with an ARIA snapshot and axe on every final state.

### Past wind for recorded efforts — 13 September 2026

Scope: `@scout/application/archive-wind` (bounded Open-Meteo archive loader with whole-day validation and contiguous date batching), `wind` stored per effort, a consent-gated "Load past wind" control in the efforts panel showing the along-route description, speed and the reference model's still-air difference for that hour, plus the own-recording confirmation that gates GPX import. Out of scope: the Strava worker, which needs a data-rights decision recorded in `docs/integration-decisions.md` before any code. Validation: 8 loader tests through the shared msw handlers including outage and rate-limit faults, contract fixture parsing, library validation, and three new atomic journeys (confirmation gate, consent-gated load with persistence, archive outage).
