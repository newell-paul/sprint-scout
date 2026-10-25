# Personal Segment & Wind Planner — Design

Status: living specification; the dated entries at the end record decisions and retractions. Product name: SprintScout.
Prepared: 7 September 2026. Audience: Astra/Codex implementing the application.
Companion: [Implementation plan](implementation-plan.md).

## 1. Product purpose

Build a private cycling application that answers: “Which of my segments have favourable wind during my available riding window, and when should I attempt them?”

The experience is a web planner with an interactive segment map and time-of-day comparison. The conversational surface originally intended here was withdrawn on 22 September 2026; the sections that describe it are marked as such. Personal performance context is desirable, but must depend on an explicitly permitted data source.

The first useful release ranks weather opportunities, not the probability of a personal record. A tailwind is one input to performance; it does not establish fitness, road safety, or likely completion time.

## 2. Critical feasibility gate: data rights

The earlier idea of a custom Strava API-to-MCP analytics service is conditional, not an approved architecture.

As checked on the date above, Strava's API Policy restricts AI use of API data and derivatives, analytics, and persistent storage. It identifies an exception for personal use through Strava's official MCP. The policy describes a seven-day transient cache exception; this is not permission for the proposed analysis. See sections 3.5, 5.3–5.5 and 6.2 of the [current policy](https://www.strava.com/legal/api_policy) and the [API Agreement](https://www.strava.com/legal/api).

Before connecting real Strava data, validate the exact intended workflow and any necessary approval. Do not treat deterministic preprocessing, anonymisation, a private account, or a custom MCP wrapper as a workaround. Official MCP availability does not establish that it supports segment geometry, history, weather joins, or the desired presentation.

Implementation modes:

1. **Demo:** synthetic segment geometry and synthetic effort history; real weather only for deliberately selected demo coordinates.
2. **Independent personal data:** user-created routes or original device files with confirmed rights and permitted processing. A file exported from Strava is not automatically an independent source.
3. **Official Strava MCP:** investigate supported capabilities and permitted personal workflows. Do not proxy or persist its output without verifying permission.
4. **Direct Strava integration:** disabled unless the intended collection, analysis, storage, and any AI disclosure are explicitly permitted.

Milestone 0 must record an allowed source and usage matrix. Building the demo does not require this gate to pass. Enabling a real-data path does.

## 3. Scope

### MVP

- One authenticated owner; no public registration or sharing.
- Cycling only, metric defaults with a preference for imperial display.
- A small collection of selected segments, each with ordered geometry and riding direction.
- Hourly forecasts for wind speed, direction, gusts, precipitation, and temperature.
- A selected date, local time zone, and attempt window.
- Ranked segment/time opportunities with explainable along-route wind calculations.
- Interactive map, wind arrows, segment details, and a time slider.
- Source, freshness, missing-data and uncertainty labels.
- Mock and permitted-data provider adapters.
- Withdrawn 22 September 2026: read-only analysis tools in a custom MCP server for permitted inputs.
- Withdrawn 22 September 2026: embedded MCP App UI when the chosen host supports it; the web planner is the only surface.

### Later, gated enhancements

- Personal effort history and weather context from an approved source.
- Empirical performance ranges after validation; never invent PR probabilities.
- Departure suggestions using a user-supplied travel-time estimate.
- Routing-provider integration for approach travel times and multi-segment ride planning.
- Opt-in notifications and historical forecast comparisons.

### Non-goals

- Leaderboard scraping, other athletes' analysis, public KOM hunting, or a Strava clone.
- Real-time navigation, live segment timing, automatic Strava writes, or workout uploads.
- Training AI models using Strava data.
- A native mobile app, multi-tenant SaaS, billing, or a general fitness platform.
- Claims that a road is safe, that a PR is guaranteed, or that forecast wind equals wind at the rider.

## 4. Core journeys

### Find a favourable window

User: “Which of my selected segments have a tailwind tomorrow between 4 and 7 pm?”

Resolve tomorrow in the user's IANA time zone. Fetch valid forecasts, evaluate each segment/hour, and return up to five distinct segment opportunities. The response includes attempt time, average tailwind component, crosswind exposure, gusts, rain, forecast age, and calculation limitations.

### Inspect a segment

Select a result to display its directed route, coloured wind sections, elevation if available, and an hourly comparison. Moving the slider changes the same calculation in the map, chart, summary, and accessible data table. Preserve the selected segment while changing time.

### Decide when to leave

User supplies approach duration and warm-up buffer. Calculate departure time as attempt time minus those durations. Label this an estimate. Do not infer road travel time from straight-line distance or call attempt time departure time.

### Review personal performance

If permitted history exists, show effort dates, elapsed times, the best observed effort in the available dataset, sample size, and coverage. Otherwise display “Performance history unavailable”; weather analysis remains usable. Do not label a partial-history best time as a verified lifetime PR.

## 5. Visual design

Current theme trial: **Sunrise**, requested after Race Day. Soft lilac-white #F6F2F9 ground with a fixed warm-to-cool wash (peach top-left, sky-blue top-right, pink bottom), frosted translucent white panels with 22px radii, soft violet-tinted shadows and backdrop blur. Ink #241D33, muted #6B6480. Coral #FF5C4D is the route, map and decorative accent; a darker coral #D93B2E carries links, primary controls and readable accent text. Violet #5B4DFF is the wind colour (compass and map arrows) and focus ring. Gains use teal-green #0A7F63 on #D6F5EC, penalties amber #B35F00 on #FFE9CC, kept separate from selected-state coral. Type: Outfit (800) for the wordmark and display numerals, DM Sans for body, replacing Arial. Buttons round to 12px. Map tiles keep most of their colour (light desaturation only, replacing the heavy grey wash of Race Day) and wind particles are white, as in Alpine Racing. Geometry, calculations, layout and the synthetic planner's own theme overrides are unchanged. This supersedes the Race Day palette below.

Race Day theme trial (owner requested, after Alpine Racing). Warm off-white #F5F3EE background, white/cool-grey panels, graphite #20252B text, racing-red #E64040 map accents and a darker red #C92D34 for readable links and primary controls. Teal #007B66 gains and amber #946000 penalties remain separate from selected-state red. Map surfaces, controls, chart grids and particle contrast follow the light theme. Geometry, calculations, layout and typography are unchanged; the synthetic planner retains its own theme overrides. This supersedes the Alpine Racing palette below.

Alpine Racing theme trial (owner requested): midnight navy #101B2D background, layered blue-navy surfaces, ice-white #F4F8FC readings and electric-cyan #29CFFF branding, selected controls and route lines. Coral #FF7166 is a small logo/map-direction accent. Preserve semantic separation: gains use teal #58DFB5, penalties/caution use amber #FFBC66. Update the standalone cockpit's formerly hard-coded charcoal surfaces and scales consistently; layout, typography, numerical models and the synthetic planner's own light/dark overrides are unchanged.

Aim for a restrained cycling instrument panel: clear typography, generous spacing, compact metric cards, and a map as the focal point. Use neutral backgrounds, teal for assistance, amber for caution, and clear text labels alongside colour. Do not copy Strava branding. Support light/dark themes and reduced motion.

Desktop layout: date/window controls above a ranked list beside the map; selected segment details and hourly chart below. Mobile: ranked cards first, then an expandable map and details. Keep controls touch-friendly.

Each result shows:

- Segment name, length, direction, and grade when available.
- Best attempt window and the time zone.
- Tailwind component, typical crosswind, maximum forecast gust, and precipitation.
- Weather opportunity index explicitly labelled as a heuristic, not a percentage chance.
- History status and optional observed best time.
- A short explanation, limitations, and forecast retrieval timestamp.

Provide keyboard access, non-colour map legends, accessible table equivalents, loading skeletons, empty states, and retry actions. Do not silently substitute synthetic data when real data fails.

## 6. Proposed stack and boundaries

These are project choices, not claims about required or latest versions. During scaffolding select compatible stable releases from official documentation and commit the lockfile.

| Area                  | Choice                                          | Purpose                                          |
| --------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Language/tooling      | TypeScript strict, pnpm workspaces              | Shared types and reproducible builds             |
| Web                   | Next.js, React, Tailwind CSS                    | Standalone responsive application                |
| Accessible components | Hand-written React controls                     | Forms and controls, roles and names first        |
| HTTP API              | Removed 24 October 2026                         | The planner is a static export with no server    |
| MCP                   | Withdrawn 22 September 2026                     | No MCP code remains                              |
| Embedded UI           | Withdrawn 22 September 2026                     | The web planner is the only surface              |
| Storage               | Browser storage; Postgres removed 24 Oct 2026   | Saved segments stay in the browser               |
| Jobs                  | None                                            | Worker boundary reserved; Strava refresh blocked |
| Geography             | Turf.js                                         | Geometry validation and bearings                 |
| Maps                  | MapLibre GL JS; configurable licensed tiles     | Route and wind visualisation                     |
| Charts                | Hand-written React; ECharts removed 24 Oct 2026 | Hourly wind timeline                             |
| Tests                 | Vitest, Playwright                              | Calculation, integration and UI checks           |

One repository, not a fleet of microservices:

```text
apps/web/                  Standalone user interface
apps/api/                  HTTP endpoints and owner authentication
apps/worker/               Reserved boundary, no runtime
packages/analysis/         Pure wind and ranking functions
packages/application/      Shared use cases and policy enforcement
packages/contracts/        Zod schemas, DTOs and error codes
packages/database/         Schema and migrations
packages/providers/        Mock, independent files, weather, gated Strava
packages/ui/               Reusable presentation components
docs/design.md
docs/implementation-plan.md
```

Clients call adapters; HTTP adapters call the application services. Services check ownership and data permissions before reading providers or invoking pure analysis. Neither UI nor language model implements ranking math. Initially run the services on one development machine with a local database. Extract deployments only when needed.

Withdrawn 22 September 2026: the skill was to be an orchestration guide, MCP tools the validated data source and an MCP App the renderer. See [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview).

## 7. Data model and provenance

All identifiers exposed in JSON are strings. Use UTC instants internally and retain an IANA zone for user scheduling. Use metres, seconds, metres/second, degrees and millimetres internally. Coordinates are GeoJSON longitude/latitude.

Proposed entities:

- `owner`: local identity and authentication configuration.
- `preferences`: time zone, display units, default window and warning thresholds.
- `connections`: provider identity, granted scope, approval reference and encrypted credentials where applicable.
- `segments`: owner, source ID, name, ordered LineString, computed length, optional elevation, source provenance and retention policy.
- `efforts`: permitted source, segment, activity time, elapsed time, optional moving time, equipment/category and quality flags.
- `weather_snapshots`: provider, returned model/grid metadata when available, coordinates, retrieval time, valid hours, units and expiry.
- `analysis_runs`: versioned configuration and reproducibility metadata; persistence of input/output requires source permission.
- `jobs`: deduplication key, owner/connection generation, status, attempts and checkpoint.

Every input carries `sourceKind`, `sourceId`, `retrievedAt`, `expiresAt` where relevant, and a policy profile. Profiles explicitly permit or deny analysis, persistence and AI disclosure. Fail closed when permission is unknown. Derived results inherit source restrictions; deleting a source invalidates its dependent caches/results.

Database design does not grant permission to populate tables with Strava data. Keep provider retention rules separate from ordinary app preferences and synthetic fixtures.

## 8. Integrations

### Weather: Open-Meteo

Use Open-Meteo as the first provider behind a `WeatherProvider` interface. Request hourly `wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m`, `precipitation`, `precipitation_probability`, and `temperature_2m`; request SI wind units explicitly. Validate actual returned units and nullable fields. Obtain sunrise/sunset if displaying daylight warnings.

Forecast requests use UTC; the presentation layer converts to the selected zone. Support a default next-48-hour horizon, with a maximum constrained by actual returned coverage. Batch nearby representative coordinates and cache identical requests for 30 minutes as an initial application setting. Show retrieval time; only show model issue time if the provider actually returns it. Never label retrieval time as model run time.

Ten-metre forecast wind is a coarse proxy for rider conditions. Buildings, hedges, terrain and surface conditions remain unmodelled in MVP. Do not assume that sampling many coordinates increases model resolution. Preserve attribution and verify service terms and applicable usage limits before deployment. [Open-Meteo documentation](https://open-meteo.com/en/docs).

### Segment and effort providers

Define capabilities such as `listSegments`, `getGeometry`, `listEfforts`, `supportsPersistence`, and `allowsAiDisclosure`; capability flags must be backed by documented decisions, not just successful HTTP calls.

For an approved direct Strava path, inspect supported endpoints, subscription requirements, scopes and limits before implementation. The reference documents segment-effort retrieval as subscription-dependent. Do not assume full historical coverage. [Strava API reference](https://developers.strava.com/docs/reference/) and [getting started](https://developers.strava.com/docs/getting-started/).

If enabled, use OAuth state validation, least privilege, server-side token exchange, encrypted token storage and serialized refresh-token rotation. Honour rate-limit responses, bound pagination and use deduplicated background work. Add webhooks only after validating supported events and verification requirements; stale jobs must not reinsert data after deletion or disconnect.

## 9. Wind calculation specification

### Geometry

Validate coordinate ranges and order. Remove consecutive duplicate points. Reject zero-length geometry. Divide the ordered line into legs no longer than 100 m as an initial configurable sampling setting, preserving corners. Compute each leg's geodesic length `d_i` and forward bearing `b_i`. Use actual riding direction, not a start-to-end bearing for a curved segment.

### Wind vectors

Meteorological wind direction `f` is where wind comes from. Convert to travel direction `w = (f + 180) mod 360`. For speed `v`:

```text
east  = v * sin(w)
north = v * cos(w)
tail_i  = east * sin(b_i) + north * cos(b_i)
cross_i = east * cos(b_i) - north * sin(b_i)
```

Convert angles to radians before trigonometry. Positive `tail_i` assists travel; negative is headwind. Keep signed crosswind for arrows but use its absolute value for exposure metrics.

For a segment at a candidate hour:

```text
mean_tailwind = sum(d_i * tail_i) / sum(d_i)
mean_abs_crosswind = sum(d_i * abs(cross_i)) / sum(d_i)
tailwind_fraction = sum(d_i where tail_i > 0.5 m/s) / sum(d_i)
```

The 0.5 m/s threshold is an application heuristic. Report maximum absolute crosswind and the worst headwind leg as additional context. Do not average wind direction angles directly: interpolate east/north vectors if sub-hour estimates are later introduced. MVP evaluates supplied forecast hours; a slider does not imply minute-level forecast precision.

Use weather at spatial sample points without extrapolating beyond valid coverage. Missing wind excludes an opportunity; missing rain/gust data produces an explicit incomplete-weather warning. Gust speed is not sustained tailwind; do not add it to the tailwind component. MVP treats each segment as occurring at its attempt hour; long-duration traversal modelling is deferred and must be labelled.

### Ranking

First apply source permission, geometry, coverage and user filters. Put configured warning-threshold breaches in a separate caution group, never describe remaining rows as safe.

Default weather index, version `wind-v1`:

```text
index = 100 * clamp((mean_tailwind_mps + 5) / 10, 0, 1)
```

This arbitrary, transparent index ranks along-route assistance only; its constants are configurable and versioned. It is not expected speed gain or PR probability. Within each warning group, sort by index descending, mean absolute crosswind ascending, precipitation amount ascending where known, then attempt UTC and segment ID. Unknown precipitation sorts after known values on a tie.

Select the best hour per segment for the default list; expose all hours in details. Display the underlying measurements so the index is never the sole explanation.

### Performance estimates: deferred

Do not present wind speed as a personal cycling speed. Personal history may be affected by drafting, traffic, stops, equipment, fitness and effort level. A later prediction feature needs a documented eligible dataset, held-out evaluation, baseline comparison and calibrated uncertainty. Until then return `prediction: null` with a reason. No numeric PR probabilities in MVP.

### Reference-rider ride effect (`ride-effect-v1`)

A separate, explicitly generic indicator estimates how the forecast wind changes the pace of an average ride. It is a power-balance model, not a prediction for the user: a reference rider who holds 40 km/h in calm air on flat road (CdA 0.36 m², Crr 0.005, 85 kg rider plus bike, air density 1.225 kg/m³), and the constant power that speed implies. Scale the 10 m forecast wind to handlebar height first using a logarithmic profile over open grassland: factor `ln(1.5 / 0.03) / ln(10 / 0.03) ≈ 0.67`, reported as `riderHeightFactor`; shelter from hedges and buildings is not modelled. For each leg, solve `P = v · (½ρ·CdA·(v − w)|v − w| + Crr·m·g)` for ground speed `v` given the scaled along-route wind component `w` (tailwind positive, clamped to ±30 m/s) by bisection on the monotonic interval `v ≥ max(0, w)`. Combine legs by time, not distance, so headwind legs dominate. Report the effective speed against the calm-wind baseline as a signed km/h delta plus the time delta. Label it "for an average ride", show the constants in limitations, and never combine it with personal history.

The indicator carries an estimated range derived from an assumed one-sigma forecast error that grows with lead time: wind speed `1 + 0.02·h` m/s and direction `15 + 0.3·h` degrees for `h` hours between retrieval and the attempt. Per leg the along-route error combines the speed error scaled by the cosine of the wind-to-route angle with the direction error scaled by the sine, so the band widens when the wind is near-perpendicular to the route. The band is the effect recomputed at ±one sigma on every leg. These constants are a documented heuristic for open terrain, not a measured model skill, and must be described as such in the UI.

The drawn-segment preview also requests the provider's WMO `weather_code` and `is_day` flag and shows a weather symbol for the selected hour. Symbols are decorative context with an accessible label; they do not feed the ranking or the ride effect.

The owner may replace the reference rider with sustained power (50–1000 W), rider-plus-bike mass (40–200 kg) and CdA (0.15–0.6 m²). The calm speed is then the still-air speed that power implies with the same Crr and air density, and every other step of `ride-effect-v1` is unchanged. Inputs are stored only in the browser, validated on read, and any unreadable value falls back to the reference rider. This remains a flat-road constant-power physics estimate and must still be labelled as not a validated personal prediction.

## 10. Application and MCP contracts

Version contracts with Zod and generate shared TypeScript types. Inputs have explicit bounded limits and ISO timestamps including offsets. The server derives owner identity from authentication; caller-supplied athlete IDs never grant access.

Initial tools:

| Tool                      | Input                                         | Result                                             |
| ------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `list_segments`           | Optional filter, bounded cursor/page size     | Permitted segment summaries and capabilities       |
| `get_segment_conditions`  | Segment ID, UTC window, display zone          | Geometry, hourly metrics, provenance and warnings  |
| `rank_wind_opportunities` | Segment IDs, UTC window, display zone, limits | Ranked distinct segments plus explanation fields   |
| `get_segment_history`     | Segment ID, bounded date range                | Permitted history or structured unavailable reason |
| `estimate_departure`      | Attempt instant, approach and warm-up minutes | Departure instant and assumptions                  |

An opportunity DTO contains `segmentId`, `attemptAt`, `timeZone`, `tailwindMps`, `meanAbsCrosswindMps`, `maxAbsCrosswindMps`, `tailwindFraction`, `gustMps`, `precipitationMm`, `precipitationProbabilityPct`, `weatherIndex`, `warnings`, `dataQuality`, `retrievedAt`, `algorithmVersion`, and nullable `prediction`.

Use explicit error codes: `AUTH_REQUIRED`, `SOURCE_NOT_PERMITTED`, `CAPABILITY_UNAVAILABLE`, `GEOMETRY_INVALID`, `FORECAST_UNAVAILABLE`, `OUTSIDE_FORECAST_RANGE`, `RATE_LIMITED`, and `INSUFFICIENT_HISTORY`. A partial batch includes per-segment errors rather than silently dropping failures.

Read tools must not trigger unbounded import jobs. Keep refresh/disconnect/delete operations in authenticated app settings initially. MCP output passes an AI-disclosure policy check before any source data or derived content enters the host. Do not hide prohibited content in UI metadata as a workaround.

## 11. Skill and embedded UI (withdrawn 22 September 2026)

Create the dedicated skill only once the tool contracts work. Its instructions should:

1. Resolve date/window/time zone and selected segment scope.
2. Call ranking, then fetch details for the selected result.
3. Present the interactive view if supported, otherwise a concise table and authenticated web link.
4. Distinguish attempt and departure times.
5. Explain warnings and incomplete data without inventing missing values.
6. Avoid unsupported performance claims and refuse disallowed data flows.

The UI resource receives a bounded DTO, uses the host SDK for supported tool calls, validates inbound data, and applies an explicit content-security policy. No secrets in HTML, tool results, URLs, or browser storage. Test the selected host's authentication, resource loading, map networking and interaction model. A skill alone cannot ensure arbitrary chat clients render the UI.

## 12. Security, operation and deployment

### Static publication of the segment planner — 13 September 2026

Owner requested. The browser-only segment planner (the web app's default page) may be published as a static site on GitHub Pages. This is possible because that page holds no owner data: drawn routes, targets, shelter and terrain settings live in the visitor's own browser storage, and wind, elevation and map tiles are requested directly from Open-Meteo and OpenStreetMap, neither of which needs credentials. No authentication is added because the site has nothing to protect; the loopback rule for the HTTP API is unchanged.

Mechanism: `STATIC_EXPORT=1` switches Next to `output: "export"` with a configurable `basePath`. Server-backed entries (the demo planner page, its `/api/planner` handler, `/health`, and the `/routes` redirect) carry a `.server.ts(x)` suffix that the static build's `pageExtensions` does not include, so they are excluded from the export and unchanged in development. The Fastify API, worker, MCP server and embedded UI are not deployed. The public OpenStreetMap tile server remains the map source; if traffic grows beyond personal use, switch to the configurable licensed tile provider in section 6. Attribution and the data-rights gates in section 2 apply to the published site exactly as locally.

- Private owner authentication is mandatory outside loopback development. No public sign-up.
- HTTPS for remote access; secure, HttpOnly, SameSite cookies and CSRF controls where applicable.
- Remote MCP authentication no longer applies (withdrawn with milestone 5 on 22 September 2026).
- Encrypt refresh tokens with a separately managed key. Never put secrets in browser bundles or logs.
- Redact coordinates, raw provider payloads, tokens and personal effort records from operational logs.
- Validate uploaded files, restrict size/point counts, and disallow arbitrary URL fetching to prevent SSRF.
- Parameterize queries, enforce ownership in every repository operation, and rate-limit expensive analysis.
- Source-aware expiry jobs cover raw and derived caches, queue payloads and backups. Store no prohibited source data in fixtures, analytics, traces or AI prompts.
- Provide disconnect/delete controls, invalidate in-flight jobs, and test restoration without resurrecting deleted records.
- Use structured non-sensitive logs, provider latency/error metrics, and readiness/liveness endpoints.

Development uses Docker Compose for PostgreSQL/PostGIS and local Node processes. A later personal deployment may use a small private server with a reverse proxy; choose a host only after the data-access and MCP-host gates pass. Do not deploy or incur paid services automatically.

## 13. Acceptance and open decisions

MVP is complete when an owner can select permitted segments, compare hourly wind, inspect a map, and receive consistent results through the web planner (MCP paths withdrawn 22 September 2026); unsupported integrations remain visibly disabled. Test suites must cover wind sign, curved segments, missing weather, DST, owner isolation, policy denial, and provider failure. Target a cached 50-segment/48-hour ranking under two seconds on the documented development machine; measure rather than claim it.

Defaults: unnamed personal cycling app; single owner; Open-Meteo; hourly slots; weather-only ranking; demo-first development; no deployment and no real Strava access until validated.

Blocking decisions before real-data release: permitted segment/history source, exact approved Strava workflow if any, owner authentication and hosting choice. Cosmetic branding and optional predictions are not blockers for the demo.

## Milestones 0–1 implementation decisions (7 September 2026)

The foundation uses only the server-registered synthetic-v1 policy. Independent data, Strava (including official MCP) and live weather remain disabled; see [integration decisions](integration-decisions.md). Package boundaries for later runtimes are reserved without implementations. The initial database contains only an idempotently seeded synthetic fixture table; full domain schema and jobs remain deferred. The API runs TypeScript via tsx and build validates types. Loopback demo readiness does not depend on PostgreSQL. Node 22 LTS was the documented runtime (Node 26 since 9 October 2026); compatible Next 16/React 19, Fastify 5, Zod 4, Vitest 4 and Tailwind 4 version families were selected using their official installation documentation. Exact dependency resolutions are recorded in pnpm-lock.yaml.

Dependency references: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Fastify getting started](https://fastify.dev/docs/latest/Guides/Getting-Started/), [pnpm installation](https://pnpm.io/installation), [Vitest guide](https://vitest.dev/guide/), reviewed 7 September 2026. Specification filenames were lowercased on 9 October 2026.

## Milestone 2 implementation decisions

The pure `packages/analysis` engine uses Turf distance, bearing and destination (7.3.4, pinned in the lockfile) with explicit metre units. See the official [distance](https://turfjs.org/docs/api/distance), [bearing](https://turfjs.org/docs/api/bearing) and [destination](https://turfjs.org/docs/api/destination) references. Inputs use longitude/latitude; coordinate-range validation cannot detect every swapped pair when both values are valid in both ranges. Consecutive duplicates and sub-micrometre zero legs are removed. Sampling defaults to 100 m, configurable down to 1 m, retaining original corners and rejecting more than 2,000 legs per segment (which also rejects ambiguous global-scale routes).

Batch limits are 50 distinct segment IDs, 10,000 input points per geometry, 48 distinct hourly slots per segment and a UTC window no longer than 48 hours. Windows are start-inclusive/end-exclusive; only exact supplied UTC hours are evaluated. No interpolation, spatial weather lookup or live provider is implemented. Inputs explicitly assert segment-wide coverage or supply one weather observation for each prepared leg; gaps fail closed. Future adapters must establish that spatial coverage rather than infer it from this assertion.

The shared application service checks source analysis and derived-output permission before invoking geometry/wind functions, and AI permission when requested. Results retain input provenance so derived restrictions are not lost. It returns per-segment/per-hour error codes and never substitutes calm for missing wind. These services are not yet exposed through new HTTP or MCP routes.

`wind-v1` includes the exact index configuration in every opportunity. Its default offset/span are 5/10 m/s. Tailwind assistance uses a strict greater-than 0.5 m/s threshold; caution warnings use strict greater-than configured gust, maximum absolute crosswind or precipitation thresholds. No warning thresholds are invented as safety defaults. Within each caution group the specified index/crosswind/rain/UTC/ID ordering applies, using binary ID comparison. Best-hour selection uses that same ordering, including the index's saturation ties. Inputs are not mutated.

For spatial weather, gust, precipitation and precipitation probability summaries use the maximum; a missing value in any leg makes that summary null. Known warning breaches remain caution even when another leg is missing data. Incomplete optional weather is explicitly warned. Retrieval summary is the oldest contributing weather retrieval time, with all provenance retained. Worst headwind is a signed nonpositive component (zero if all legs assist). Every opportunity/error and geometry/vector result identifies `wind-v1`; numeric helper functions are internal computation primitives. Predictions remain null with a reason, and the entire route is evaluated at its attempt hour.

`pnpm benchmark:wind` measures full application evaluation and ranking over already computed in-memory rows separately. It creates no persistent cache and does not implement milestone 3 weather caching. Numerical tolerances are 1e-8 m/s for cardinal/weighted projections, 1e-5 m/s for curved-route geodesic effects, and 1e-6 m for maximum leg-length checks. Benchmark inputs are synthetic.

## Milestone 3 implementation decisions (8 September 2026)

`WeatherProvider` and forecast DTOs live in providers/contracts; the application layer handles source-gated sampling and joins. `OpenMeteoProvider` defaults to disabled. Synthetic replay requires an explicit mock transport. The optional live mode is confined to the documented invented-route demo region; see the updated [integration decisions](integration-decisions.md). The registry now permits the named Open-Meteo weather profile, while segment geometry remains synthetic-only. Snapshot metadata has its own provenance and all raw/derived disclosure paths, including stale envelopes, enforce permissions.

Requests batch up to 50 representative points and at most 48 supplied UTC hours. The default next-48-hour window starts at the next whole UTC hour (including the current hour only when exactly aligned). Non-hour-aligned riding windows select only contained hourly instants. API `start_hour`/`end_hour` represent the first/last selected hour; application windows remain end-exclusive. Live requests reject historical windows and windows beyond the documented 16-day maximum; actual returned coverage remains authoritative. Missing hours create explicit per-hour errors; no temporal interpolation or extrapolation is implemented.

Sampling walks segments in binary ID order and their directed sampled legs, choosing geodesic midpoints and reusing the nearest existing representative within 1 km. A batch is capped at 50 representative points, with per-segment errors if sampling exceeds this bound. Returned grid centres are retained separately from requested coordinates. This 1 km application sampling heuristic does not claim corresponding forecast-model resolution or model wind at the rider.

Open-Meteo responses are bounded to 2 MB, validate UTC offsets, chronological unique times, nullable columns and array lengths, and normalize recognized returned units to SI. A 360-degree direction normalizes to zero; 359/1-degree values remain separate hourly observations. Invalid values and unknown units fail explicitly. Missing columns/cells stay null. Attribution and transformation notices appear in snapshots, derived provenance, `/weather/demo`, and the synthetic web preview. Requested model selection is labelled best-match; actual model name and model issue time remain null because the forecast response does not establish them. Provider generation latency is not a model timestamp.

Identical requests share an in-flight operation and a 30-minute fresh in-memory cache. The cache is bounded to 64 batches and four simultaneous distinct requests; callers receive copies. After a failed refresh, snapshots may be returned explicitly stale for at most six hours from retrieval, with their original timestamps and error. The application exposes dated stale snapshots but does not rank them. Expired entries are removed on access and never served. No database cache or persistence job is introduced.

Each upstream attempt has a five-second timeout spanning headers/body, at most three attempts, bounded exponential delay with jitter, and Retry-After support. Long rate-limit waits return a retry instant without blocking the caller; subsequent requests respect a provider-instance cooldown. Permanent HTTP errors, malformed payloads and unknown units are not retried. Clock, fetch, sleep and randomness are injected for deterministic tests. These instance-local bounds do not replace deployment-wide quotas.

Local scheduling uses `@js-temporal/polyfill` 0.5.1 (Node 22 compatibility). Invalid local values and DST gaps fail; repeated times require explicit earlier/later disambiguation. An end clock earlier than the start means the following local day; equal clock values are rejected as an ambiguous/empty window. Relative today/tomorrow is computed from an explicit UTC reference in the user's zone. Display labels include local date, offset and IANA zone to distinguish repeated hours. See [Temporal ZonedDateTime](https://tc39.es/proposal-temporal/docs/zoneddatetime.html) and [polyfill documentation](https://github.com/js-temporal/temporal-polyfill).

The web/API continue to use only fixed synthetic weather, clearly labelled with a fixture clock. The optional live smoke test is a separate command and normal CI has no live-provider dependency. No milestone 4 controls, map or interactive ranking UI have been started.

## Milestone 4 implementation decisions (8 September 2026)

The standalone planner uses MapLibre GL JS 6 and ECharts 6, with exact versions in the lockfile. MapLibre 6 ships as ES modules and locates its web worker from `import.meta.url`, which Next rewrites to a non-http value; the worker then fails silently and every GeoJSON layer stays blank while the raster basemap and HTML markers still show. The worker and the shared chunk it imports are therefore copied from `node_modules` into `apps/web/public/maplibre` before `dev` and `build`, and `@scout/ui/maplibre` points `setWorkerUrl` at that path under the configured base path before any map is created. The initial map is tile-free: local geometry, generated arrow sprites and a neutral background require no external tile service, fonts, keys or network access. This preserves the configurable licensed-tile architecture without selecting a service. Riding arrows follow directed legs; blue wind arrows indicate wind travel direction and are offset for readability, not additional sample locations. Headwind sections have dashes as well as colour. Accessible route-section and hourly tables remain usable if WebGL or chart rendering fails. The map resizes when its expandable container changes size.

A bounded `plannerRequest` accepts the two synthetic IDs, an explicit local date/window/zone, DST choices and named demo scenarios. `plannerResponse` carries summaries, selected-hour leg vectors, best-hour references, errors, coverage and fixture attribution. Next server rendering and its same-origin GET adapter, plus Fastify POST `/planner/demo`, call the same application service. All scoring and vector reconstruction run in that service; presentation never recomputes ranking. The client keeps one selected segment/UTC instant across the map, chart, table, card and departure estimate. Unselected cards show their best hour; changing the selected hour does not reorder the best-hour ranking. Hour changes use the loaded response without an upstream request. A failed window request retains the previous applied results with an explicit error.

The planner uses authored synthetic forecasts covering 8–9 September 2026, anchored to 2026-09-08T12:00:00Z. Values are keyed to absolute UTC hour, so overlapping queries return identical weather. Missing fields, provider outage, invalid geometry for one route and stale weather are explicit selectable fixture scenarios. No scenario enables live transport. Demo caution thresholds are gusts above 10 m/s, maximum crosswind above 4 m/s or rain above 0.5 mm, labelled as demo settings rather than a safety assessment. Stale weather is excluded from ranking. Grade and personal history remain unavailable, and predictions remain null.

Departure estimation is a shared pure function exposed through a browser-safe application subpath. It subtracts integer approach (0–360 minutes) and warm-up (0–120 minutes) durations from the UTC attempt instant before local display, avoiding DST arithmetic errors. It is not a routing-provider estimate. Both HTTP adapters remain local synthetic demos without personal-data endpoints; authentication, MCP and embedded host support are later milestones.

## Milestone 5 implementation decisions (8 September 2026)

The local MCP server uses the official TypeScript SDK v2 (`@modelcontextprotocol/server`, `client` and `core`) and MCP Apps SDK v2, selected from the published compatible peer dependencies. Their installed declarations are authoritative for the implementation because some online examples still show v1 imports. Exact package versions are locked. `serveStdio` supports both legacy and modern opening exchanges; both are exercised by the official SDK client. No remote MCP transport is introduced. Stdio input buffering is capped at 16 KiB, and application inputs have stricter bounded schemas.

A fixed local demo owner is supplied by the trusted process context. Callers cannot select an owner or provide source records, geometry, weather, permission flags or credentials. The five application use cases filter server-owned records by owner and check analysis, derived-output and AI-disclosure permission before access. Forecast sampling and raw/derived weather disclosure use the existing source gate with the AI audience. No output channel or UI metadata bypasses it. This process trust boundary is suitable only for the local synthetic demo; account and remote-host authentication remain milestone 7 work.

`getDemoConditions` is shared by the Next/Fastify planner and MCP use cases. It centralizes directed vectors, segment summaries, fixture weather, caution settings and ranking. MCP adds bounded input/output contracts and typed result/error envelopes, plus text summaries for hosts without Apps. Conditions return one selected segment with up to 48 supplied hours; ranking returns up to two best-hour summaries without redundant leg geometry. History reports unavailable rather than exposing synthetic efforts as personal records. Departure uses the existing pure UTC duration function. The application contract remains version 1, separate from SDK/protocol versions.

Map and chart implementations now live in browser-safe `@scout/ui` subpaths; Next retains thin client re-exports. The embedded React entry point uses these same components and the MCP Apps SDK, without importing Next features or application/provider code. Its receiver bounds the payload and validates single-segment consistency, chronological unique hours, time zone, best-hour references and freshness before display. Invalid results clear the view. React renders data strings as text; server and skill guidance treat names as untrusted data rather than instructions. This does not establish universal resistance of an LLM to prompt injection.

The server registers `ui://sprint-scout/segment-v1.html` with `text/html;profile=mcp-app`. Esbuild bundles the view, React, schemas, map/chart libraries, CSS and generated map worker into one HTML resource (approximately 3.1 MB before transport compression). No dynamic remote asset request is required. Resource metadata requests no external origins; the HTML additionally uses a SHA-256 script allowlist and denies connections, external fonts, frames, forms and base-URI changes. Inline styles, data/blob images and the bundled blob worker are necessary local capabilities. Stricter host policies may prevent the map, so tables remain the supported fallback. The only interactive tool call is an explicit refresh of the same conditions through `app.callServerTool`.

The named tested host is the repository's **Sprint Scout AppBridge test host 0.5.0**, in Chromium through Playwright. It retrieves the actual resource/tool data over stdio and uses the official AppBridge, separate app/host origins and a restricted iframe. It allows only the conditions refresh at the original scope, checks isolation/CSP behavior and exercises the accessible fallback. This test harness is not a conversational desktop host and does not prove that a natural-language prompt renders the app in Claude, VS Code, Codex or another product. That acceptance remains pending host selection and a real run. No personal client settings were changed.

The repository-owned `skills/sprint-scout/SKILL.md` is versioned with the tool implementation; it is not installed globally. It documents coverage-aware scheduling, tool ordering, host-dependent UI, text fallback, departure assumptions and refused sources. The earlier plan's authenticated web fallback cannot be provided before the authentication milestone: for milestone 5 the only fallback is explicitly loopback and synthetic. This sequencing limitation is recorded rather than introducing authentication or deployment early. The MCP setup guide was removed with the server on 22 September 2026.

## Independent route drawing — 9 September 2026

The owner authorized a bounded independent route-drawing slice. `/routes` draws ordered straight-line geometry (no road snapping), with explicit independent-source and local-processing confirmation. Up to 20 routes of 500 points each persist only in this browser's localStorage; corrupt storage is preserved rather than replaced. There is no server route endpoint, Strava ingestion, MCP disclosure, or remote persistence. Loading a saved copy requires confirmation again before saving. Browser data clearing removes routes. This is local prototype storage, not authenticated owner storage.

OpenStreetMap raster tiles are opt-in, with visible attribution and normal browser caching/referrers; automated tests intercept tile requests. Tile provider receives viewed-area requests. See the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and [copyright terms](https://www.openstreetmap.org/copyright). No offline download, prefetch, paid service, geocoder, or routing service is introduced. Attribution remains visible with saved routes. Saved personal routes are not yet wired to weather comparison; existing wind calculations and demo/MCP source gates are unchanged.

## Same-page independent wind overlay — 9 September 2026

Owner requested selecting saved semi-straight segments on the drawing page and a transparent wind arrow with speed controlled by a 48-hour slider. The browser application subpath `@scout/application/route-wind` supports this bounded preview; it is not an MCP tool or a new server ingestion path. Source confirmation is required, and the user separately opts into sending the selected route's start coordinate to Open-Meteo. Route names and full geometry remain local. This intentionally displays one location's wind, not the spatial route-ranking calculation. Existing server/MCP policy registries remain unchanged.

Open-Meteo's free service permits this personal non-commercial use, with CC BY 4.0 attribution. Terms checked 9 September 2026: under 600 calls/minute, 5,000/hour and 10,000/day; provider logs can retain coordinates/IP information for up to 90 days. See [terms and privacy](https://open-meteo.com/en/terms) and [forecast documentation](https://open-meteo.com/en/docs). No keys, purchase or deployment are involved. A future commercial or shared deployment needs another service review.

One explicit fetch requests 48 UTC hourly instants starting at the next whole hour, with SI speed and Unix timestamps. A 100 KB response bound, 12-second browser timeout, strict units/column validation, 30-minute in-memory expiry and cancellation on deselection/deletion apply. Missing hours keep their slider position without invented wind. Calm has speed zero and no direction arrow. Provider failures show an error without synthetic substitution. The map stays north-up; a single translucent flow arrow and speed label represent the selected hour near the drawn segment's centre. Dates and timezone remain visible. Browser tests mock weather and tiles; no personal route is transmitted by automated checks.

Drawing and forecast viewing share the page and map. Selecting a saved route preserves the current draft; viewing does not add drawing points. Deleting or changing the selected record unmounts its forecast, aborts pending requests and removes overlays. Forecasts are never put in localStorage or exposed to MCP. The demo banner now belongs to the synthetic planner rather than falsely labelling this live forecast view.

## Primary screen simplification — 9 September 2026

Following owner feedback that the split demo/drawing flow was too complex, `/` is now the personal segment screen and `/routes` redirects to `/`. Existing browser-local routes are preserved; the first saved segment is selected on load, and saving selects the new segment. The map loads attributed OpenStreetMap tiles directly. Drawing tools appear only in drawing mode; coordinate entry, library management and source details are collapsed. Viewing consists of segment selection, one transparent arrow/speed overlay and the hourly slider. Clicking the clearly labelled Show wind action, beside the location-sharing notice, replaces the separate weather checkbox; no weather request happens before that action. The old synthetic planner is retained at the unlinked `/demo` path for regression coverage and MCP demo fallback, not as part of the personal user flow. Calculations, source restrictions and local storage format are unchanged.

## Editing and forecast usability — 10 September 2026

This owner-authorized refinement stays within the independent-route slice. Editing keeps the original browser record until Save; Cancel and reload preserve it. A draft must be saved or cancelled before switching slots. Save rejects changes to the original record made by another tab. Deletion offers undo for the latest deleted record during the current page session; undo never overwrites an occupied slot. Browser storage and provider boundaries are unchanged.

The personal screen uses a compact mobile header, a shorter map and a collapsed Manage control. Resizing refits the selected segment. The forecast's selected time, previous/next-hour buttons, Today/Tomorrow shortcuts, comparison chart and labelled six-hour slider precede the detailed ride effect. Day shortcuts select the first covered hour of the browser-local day; unavailable days are disabled. Best hour selects the greatest existing modelled speed effect, choosing the earliest equal result and excluding unavailable hours. It is not a personal-performance prediction or a safety recommendation. The comparison uses the existing deterministic model with cached forecast data, with above/below-zero bars and missing-hour dots; slider navigation provides the corresponding textual values. Refresh preserves the selected instant when still covered. No new ranking algorithm or provider integration is introduced.

The remaining visual refinements add named, horizontally scrollable segment buttons with explicit Add segment slots; a Start → Finish → Name → Save drawing guide; desaturated existing map tiles, an outlined route and endpoint labels; and a fixed corner wind key with a static flow arrow. Particles can be disabled without removing the arrow. A page-level km/h or mph selector applies consistently to wind and ride-effect values without changing SI calculations or fetching weather again.

Plain-language wind labels reuse directed, distance-weighted geometry and wind projection in the application layer. Assisted and opposed legs use the existing ±0.5 m/s threshold. If each covers at least 20% of the route, show mixed headwind and tailwind; otherwise show mostly crosswind when mean absolute crosswind exceeds both 0.5 m/s and the absolute mean along-route component. Remaining means beyond ±0.5 m/s show tailwind/headwind; smaller means show light wind effect. Calm and unavailable forecasts remain distinct. These descriptive thresholds do not change the best-hour model or ranking.

The reference-rider display now says “Modelled speed effect” and “estimated range”, replacing “for an average ride” and “likely”. Slower/Neutral/Faster labels accompany the gauge, and reference pace, flat-road/85 kg assumptions, unmodelled shelter and unvalidated uncertainty are visible next to the estimate. Best hour has an expandable explanation of its scope and exclusions. No personal-prediction capability is introduced.

## Segment time badge — 10 September 2026

The owner requested a segment completion time assuming a 40 km/h still-air average. The independent-route screen now displays estimated wind-adjusted elapsed time, still-air time at that baseline, and time saved or lost for the selected forecast hour. It exposes the existing constant-power reference-rider model's effective speed: route distance divided by effective speed equals the sum of the per-leg traversal times. It does not add wind speed directly to cycling speed. Faster and slower modelled speed bounds yield the corresponding shorter and longer estimated time bounds. Seconds are rounded only for display; switching display units leaves elapsed times unchanged.

This is a conditional estimate using the requested 40 km/h baseline and existing fixed rider assumptions, not a trained or validated personal prediction. Flat road, constant effort and the selected hour's start-location wind apply throughout the segment; hills, stops, drafting and shelter are excluded. Missing wind/invalid geometry displays unavailable. The badge appears below the timeline so hourly controls remain accessible on mobile. Existing source gates and model parameters are unchanged.

## Growing segment library — 10 September 2026

The owner requested more than five segments. The personal library now grows dynamically with saved records and one empty Add segment slot, reusing unused slot numbers without renumbering existing records. Its strip scrolls horizontally by touch, trackpad or explicit left/right buttons, with the active segment brought into view without scrolling the page vertically. Existing browser records and legacy slot assignment remain compatible. There is no fixed segment-count limit; the existing one-million-character storage bound and 500-point per-route limit remain, alongside normal browser storage quotas. Slot numbers must be nonnegative safe integers below the maximum safe integer. Saving still validates the full library and preserves it on failure. Wind calculation, forecast fetching and source boundaries are unchanged.

## Ride cockpit — 10 September 2026

The owner approved a cycling-instrument presentation combining a semicircular speedometer, prominent estimated segment time, a north-up wind compass, and an hourly timing chart. This replaces the separate speed-effect and time cards on the independent-route page. Ivory readings on charcoal surfaces use teal for assistance and amber for time penalties; the headline time is neutral, avoiding a favourable colour for an unfavourable forecast.

The dial shows the existing modelled average speed, a marked 40 km/h still-air baseline and the assumed speed range. Its scale is at least 80 km/h and expands in 20 km/h steps to include the modelled speed and upper range. Units affect labels only. The wind compass explicitly remains north-up rather than implying a single riding direction for curved segments. The combined panel adds segment distance, derived from the same modelled route length, and places detailed assumptions in an expandable explanation.

One hourly time chart replaces the wind-effect bars and separate slider. Lower plotted times mean quicker traversal. A dashed still-air reference, best-hour ring and selected-hour marker provide context; missing hours break the line and show crosses. The native range input overlays the chart for click, touch and keyboard selection; a collapsible hourly table offers the same selection and textual values. The best-window summary includes the existing best-hour time and improvement over the selected hour. No interpolation or extra provider request is used for selection. On mobile the chart precedes the instruments to keep hour selection near the map, with estimated time leading the instrument panel. Existing numerical models and source gates are unchanged.

## Independent-route quick wins — 10 September 2026

Owner authorized three presentation and comparison additions to the independent-route screen, all reusing the existing deterministic geometry, wind projection and `ride-effect-v1` model (a wind-along-route ribbon was added and removed the same day at the owner's request) without new providers or milestones:

- **Rider inputs.** A collapsible rider panel supplies power, mass and CdA to the ride effect as described in section 9; the cockpit baseline, timeline, table and opportunity board all use the same rider.
- **Condition bands.** The 48-hour chart shades hours the provider flags as night and marks hours whose WMO code is drizzle, rain, showers, snow or thunder. A "dry daylight only" preference restricts the best-hour choice to daylight hours without forecast precipitation; hours with unknown daylight or weather are skipped when the preference is on. The hourly table gains a conditions column.
- **Opportunity board.** On request, the page loads a start-point forecast for every saved segment (one request each, at most three in flight, with a per-tab cache keyed by start point and bounded by the forecast freshness window) and ranks segments by time gained at their own best hour, with a 48-hour sparkline. Opening a row selects that segment and hour. Ranking is the same best-hour rule as the cockpit; segments without usable data list last with a reason.

Location sharing widens from the selected segment's start to every saved segment's start, only after the owner presses the board's button, and the board says so before the first request. No Strava path, remote transport or milestone gate changes.

## Attempt planning — 11 September 2026

Target discoverability follow-up: the target entry form is always visible above the forecast, rather than hidden in a disclosure below the instruments. It remains available when weather is loading or unavailable; only the model comparison requires a usable forecast.

Owner authorized target times, availability windows and compact conditions detail within the independent-route slice. Targets are optional, owner-entered integer seconds (1–86400) stored with each browser-local segment. They are goals, not verified history. Existing libraries remain readable. The cockpit and board compare rounded estimated seconds with the target; targets do not change the physics or ranking and no success probability is inferred. Editing retains a target; removal and deletion remove its active display.

Availability windows were removed from the interface on 14 September 2026 at the owner's request: the section no longer renders, the forecast and board always consider every hour, and the predicate below stays in the code with its unit tests should the window return. Availability was an explicit local start/end date and time in the browser's IANA zone, held for the session. Best hour and the board use the same predicate, combined with the existing dry/daylight filter. Start is inclusive and end exclusive. Evaluate actual UTC forecast instants against local wall-clock bounds: repeated DST hours both qualify, nonexistent hours contribute none. No extrapolation outside the 48-hour coverage. Manual hourly inspection remains unrestricted, with an outside-window message. Empty results are explicit, not replaced by an unrestricted recommendation.

The existing independent forecast request additionally obtains hourly gust speed, precipitation amount and probability from Open-Meteo. Validate supplied units, column lengths, finite values and bounds; absent optional columns and null cells display unavailable, not zero. The compact strip shows sustained wind, gusts, distance-weighted absolute crosswind and precipitation. Crosswind is the existing per-leg projection of 10 m start-location wind, not apparent wind or gust direction. Gusts are never added to sustained wind for performance estimates. Amounts and gusts cover the preceding hour, as documented by the provider: [Open-Meteo hourly variables](https://open-meteo.com/en/docs), checked 11 September 2026. No safety classification is introduced.

### Terrain credibility investment

Terrain-aware modelling is the next modelling priority, not a capability shipped by this slice. Keep the flat-road/terrain-not-modelled label and unvalidated range disclosure. Before enabling terrain-aware estimates:

1. Select and document a permitted elevation source and its resolution, vertical datum, retention and location-sharing implications. Do not silently enable an external provider.
2. Preserve directed per-point elevation and provenance separately from 2D map geometry; distinguish missing elevations from a genuinely flat segment.
3. Define deterministic sampling and elevation smoothing with documented thresholds. Model grade per leg, not just net elevation or average grade; avoid amplifying elevation noise on short segments.
4. Version the model, adding gravity and grade-aware rolling resistance to power balance. Specify descent roots, speed limits/coasting assumptions and unavailable cases before implementation. Keep shelter, turns, stops, acceleration and drafting exclusions explicit.
5. Test flat-road equivalence, climbs, descents, reversed elevation, equal-net-elevation rolling roads, sparse/noisy/missing elevation and energy consistency. Compare independent permitted rides against the current baseline on held-out efforts, reporting error and range coverage before making validated personal-prediction claims.

This plan does not start the gated personal-prediction milestone or authorize elevation transport. Numerical performance modelling remains unchanged by attempt planning.

## Authorized terrain-aware slice — 11 September 2026

Subsequent manual-shelter extension: the owner requested an icon-based selector. `manual-shelter-v1` provides Exposed (factor 1), Sheltered (factor 0.65) and Dense (factor 0.35), with wind/tree icons and text/pressed-state equivalents. These deliberately simple scenario factors assume 0%, 35% and 65% wind reduction; they are not empirical tree-protection estimates. Apply uniformly to the whole segment's along- and cross-route wind components before the existing rider-height adjustment, in both flat and terrain modes. This reduces headwind penalties and tailwind benefits; it never changes source forecast wind, gusts, condition readings, map arrows or warnings. No vegetation service or extra disclosure is introduced.

Store the validated named choice per browser-local segment; older segments default to Exposed. Edits retain the manually assigned choice for review. The cockpit, target comparison, hourly chart and board use the same chosen scenario. Show the exposed time alongside an adjusted time, and explicitly label assumed shelter. The displayed time/speed envelope spans the wind-error ranges of both exposed and selected scenarios, rather than presenting a narrower band as validated protection. Calm baselines are unchanged. Missing wind or required terrain remains unavailable. Direction-dependent shelter, gaps, seasonal foliage and turbulence remain unmodelled; no gust reduction or road-safety claim is allowed.

The owner's subsequent request to implement terrain-aware modelling authorizes this bounded extension of the independent-route slice. The earlier terrain plan is now implemented as an optional deterministic physics model, not validated personal performance prediction. No Strava, training-data or remote-host gate changes. Elevation requests require a separate per-selection checkbox and Load terrain action; the source decision is recorded in integration-decisions.md.

### Elevation data and preparation

Use the Open-Meteo elevation endpoint with Copernicus GLO-90 2021, a nominal 90 m surface grid. The underlying product uses EGM2008 heights; the endpoint supplies no per-response datum, issue or accuracy metadata. Do not imply surveyed road elevation. See [provider API](https://open-meteo.com/en/docs/elevation-api) and [Copernicus product description](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM).

`glo90-profile-v1` samples uniformly along the complete directed geometry with `ceil(horizontal length / 100 m)` intervals, including endpoints. Segments shorter than 90 m or longer than 100 km are refused. At most 1001 coordinates are requested in sequential batches of 100, rounded to six decimal places for transport. This sampling does not increase source resolution. An individual leg exceeding the existing geometry limits remains invalid.

Persist raw elevations, retrieval timestamp, source identity, version and exact ordered geometry key with the browser-local segment. Missing/null, non-finite, out-of-range elevations (-500–9000 m), unexpected count, wrong version or mismatched geometry are not filled with zero. Invalid stored elevation is discarded without losing the segment; a selected terrain mode then displays unavailable until reloaded or explicitly changed to flat mode. Coordinate edits, including reversal, invalidate elevation; renaming without geometry changes preserves it. Deletion removes the local profile. Pending requests are aborted on unmount and cannot restore a deleted segment.

Automatic reload (owner requested, 13 September 2026): each browser-local segment may store `terrainAuto`, set from a "Reload terrain automatically after this segment is edited" checkbox that is only enabled once the sharing consent box is ticked. When set and the segment is in terrain mode, a geometry edit that invalidates elevation triggers one elevation request for the new geometry using that stored per-segment consent; a failed automatic attempt is not retried until the geometry changes again or the owner presses Load terrain. The setting is visible in the panel, cleared by Remove elevation, and never causes any other automatic request.

Apply one symmetric three-sample smoothing pass with weights 1:2:1; retain endpoint heights. This deterministic heuristic preserves linear grades and attenuates sample noise but is not accuracy calibration. Interpolate heights between uniform samples. Split analysis legs at both original geometry boundaries and profile sample boundaries so hills are not reduced to net elevation. Each leg has grade `rise / horizontal distance` and road distance `hypot(horizontal distance, rise)`. Refuse absolute grades above 30%, rather than clamp questionable data. Profile ascent/descent and maximum grade describe the smoothed model, not verified road measurements. Both raw and smoothed values have an accessible table.

### Terrain physics (`terrain-effect-v1`)

Keep `ride-effect-v1` unchanged for explicit flat-road comparisons and the synthetic/MCP interface. The independent route result can instead use the new version. For slope angle `theta = atan(grade)`, steady speed `v`, along-road rider-height wind `w` and reference wheel power `P`:

```text
force(v) = 0.5 * rho * CdA * (v-w) * abs(v-w)
           + mass * g * (sin(theta) + Crr * cos(theta))
force(v) - P/v = 0
```

Use the same reference power implied by the rider's flat-road calm pace. Project horizontal along-route wind onto the slope using `cos(theta)` after the existing rider-height adjustment. The force residual is strictly increasing for positive speed and power, including descents and sub-tailwind climbing speeds, so 60 bisection iterations on `(0, 40] m/s` select the unique root. Reject nonpositive power, invalid rider parameters, wind beyond ±30 m/s or a root above 40 m/s; never silently cap the result. The upper bound is a numerical domain limit, not a recommended or safe speed. No braking, coasting cap or acceleration model is implied.

Sum per-leg traversal times; compute the still-air baseline on the same terrain, not on an unrelated flat road. Terrain and flat-road mode selection updates the cockpit, target comparison, 48-hour chart and board consistently. The board labels each segment's model. Best-hour filtering and time-gain ranking otherwise remain unchanged. The estimated range reuses the wind-only perturbations, recomputing terrain traversal times; it excludes elevation, rider and model errors. Missing terrain in terrain mode yields unavailable, not an automatic flat-road fallback. Failed reloads preserve the previous saved profile and mode and display an error.

The UI retains explicit unvalidated-estimate language. Constant-effort steady states can be poor approximations on short sprints, descents, braking corners and changing grades; buildings, vegetation, bridges and tunnels can corrupt surface-grid road heights. Held-out ride validation remains future work and no personal-prediction accuracy claim is enabled.

## Quality gates — 13 September 2026

Static analysis now mechanises two standing design rules. dependency-cruiser fails the build when `apps/*` import `packages/providers` or `packages/database` (apps reach data only through `@scout/application`), when `packages/analysis` imports anything but `@scout/contracts`, when `packages/contracts` imports anything, or when any module cycle exists. Breaking the existing cycle inside `packages/application` moved `SourceNotPermitted`, `requirePermission` and `withPermittedSources` from the package index into `policy.ts`; the index re-exports them, so every public import path is unchanged.

Vitest enforces coverage thresholds: 100 % for `packages/analysis`, 95 % for `packages/application`, 80 % elsewhere, ratcheted upward only. The deterministic core carries property-based invariants (energy conservation and rotation invariance of the wind projection, monotonic speed in tailwind and power, uncertainty bands that always contain the point estimate, flat terrain agreeing with the flat-road model, DST round-trips across eleven zones, and saved-library idempotence), exact-boundary tests either side of every documented limit, and golden fixtures for ranking and one recorded hour. StrykerJS ran nightly on analysis and application (manual dispatch since 9 October 2026) with a breaking threshold that only moves up. Property tests run with a fixed seed so the gate is deterministic; `FC_SEED` explores further locally.

ESLint adds React, hooks, jsx-a11y, Playwright, Vitest, import and unicorn rules. Three React compiler-style rules (`set-state-in-effect`, `no-array-index-key`, ref naming) are switched off because the existing components use those patterns deliberately; enabling them is a refactor decision, not a lint decision. Scrollable tables keep `tabIndex` with `role="region"`, which jsx-a11y is configured to allow.

Every end-to-end test now ends with an axe run against its final page state (serious and critical violations fail; exceptions live in `e2e/a11y-allowlist.json` with an owner and expiry). Its first run changed two things in the Sunrise theme: the accent, gain and loss tokens darkened to `#c2301f`, `#087359` and `#9e5400` so small text meets 4.5:1 on the translucent panels, and every horizontally scrollable table container is a labelled, focusable region so keyboard users can scroll it.

The end-to-end suite is organised by family rather than by journey: one scenario per behaviour, seeded storage instead of clicking through setup, and a fixture that stubs Open-Meteo automatically so no test can reach the live API (the migration found one that did). Fault scenarios cover a forecast that never answers, a 429, an empty body, failed tiles, a full storage quota and unreadable storage; clock scenarios use a controllable clock for the 30-minute forecast refresh and pin the spring DST gap and autumn overlap in Europe/London; keyboard scenarios drive drawing, hour selection, terrain loading and the hourly table without a pointer; privacy scenarios assert on the network log that nothing leaves the page before consent, that only Open-Meteo and the tile host are contacted, that requests carry no referrer or cookies, and that a forecast request carries only the segment start. Visual scenarios compare the dial, compass, timeline and the demo chart against Linux baselines generated inside the Playwright container, so the comparison is only meaningful in CI or under `VISUAL=1`.

Deploying is gated. `pnpm check:deploy` builds the static export under the project base path, serves it the way GitHub Pages serves a project site (compressed, 404 page, nothing outside the export), runs the smoke journeys against it, enforces a size ceiling on the client JavaScript and runs Lighthouse with category floors and a script budget; the Pages workflow runs the same gate before `deploy-pages`, and CI runs it on every push so a regression is caught on the pull request rather than the release. Timing budgets for the ranking path live in a separate Vitest project so the unit shards stay deterministic. The foundation database commands are exercised against a throwaway Postgres (nightly then, per pull request since 9 October 2026) through testcontainers (migrate and seed twice, asserting idempotency and the synthetic-only constraint), the smoke journeys run five times each to hunt flakes, and a flaky test is quarantined by a reviewed pull request with an issue rather than skipped; the nightly run published a test health page beside the app (built by Checks on `main` since 9 October 2026). `pnpm audit --prod` is part of the static gate: its first run reported a critical advisory in MapLibre GL 5, and the map library moved to 6.9. That upgrade blanked every GeoJSON layer without failing a single test, because no journey checked that the map had painted anything; the drawing and demo journeys now count route-coloured pixels in a canvas screenshot, and the drawing check is part of the smoke set the static gate runs under the base path.

Component tests are the level between unit and end-to-end: `apps/web/app/**/*.browser.test.tsx` render one component in real Chromium through Vitest browser mode, with the app's stylesheet, the browser clock frozen and Open-Meteo answered by the same recorded fixtures as every other level through an msw service worker. Each component state is asserted by role and accessible name, committed as an ARIA snapshot next to the test, and checked by axe before teardown. Test doubles stop at the network: components receive real routes, riders and profiles built by `apps/web/test/fixtures.tsx`, never mocked modules.

## Recorded efforts and GPX import — 13 September 2026

The planner can now hold your own times on each drawn segment, matched from a ride recording rather than typed in. This is the first personal-performance data in the product and it stays inside the browser: a GPX file chosen through the file picker is read locally, matched against the selected segment and discarded; only the matched efforts are saved in local storage next to the segment. Nothing is uploaded and no account exists.

### Effort matching (`effort-match-v1`)

`matchEfforts(segment, track)` in `@scout/analysis/effort-match` is pure and deterministic. The segment is prepared with the same directed geometry as the wind engine. Each track point is projected onto the segment in a local equirectangular frame, giving a signed along-route distance (negative before the start, beyond the length after the finish) and an off-route distance. An effort starts when consecutive points cross the start line while within a 25 m gate, continues while every point stays inside a 40 m corridor and never moves more than 15 m backwards along the route, and finishes when the along-route distance passes the segment length with a point inside the gate. No two consecutive samples inside an effort, including the pair that crosses the start, may be more than 60 s apart, so a paused recording is not timed across its pause. Start and finish times are interpolated linearly between the two samples that straddle each line, so one-second recordings give sub-second times. A ride in the opposite direction, a detour outside the corridor or a track that never reaches the finish yields nothing. Repeated laps yield one effort each, in order. The result records the largest off-route deviation and the largest sampling gap so sparse or noisy recordings are visible rather than silently trusted. Tracks are limited to 250,000 points and must have strictly increasing times.

### GPX reading

`parseGpx` in `@scout/application/gpx` reads `<trkpt>` elements with a time, ignores extensions, waypoints and untimed points, and rejects files over 25 MB, files that are not GPX, and tracks with fewer than two timed points. It uses no XML library and never follows references.

### Storage and invalidation

Efforts are stored on the route as `efforts[]` with the matched geometry key. Reading the library drops any effort whose key no longer matches the route points, and redrawing a segment saves an empty list, so a time can never be attributed to a different line. Imports are de-duplicated by start time, and a segment holds at most 200 efforts. The panel shows the best time in its heading, each effort's date, time, wind and track fit, and a remove control per row.

### Source confirmation

The import control stays disabled until the rider ticks "The file I import is my own device recording and I have the right to use it here." This is the file-import counterpart of the independent-source confirmation on drawn routes, and it is the boundary the data-rights gate in section 2 asks for: an original device recording is mode 2 independent data; a file merely downloaded from a third party is not, and the confirmation puts that judgement with the rider.

### Past wind for efforts (`open-meteo-archive`)

Behind a separate consent ("Share this segment's start coordinate and the dates of these efforts with Open-Meteo for past wind") and an explicit button, the planner fetches the Open-Meteo historical archive for the UTC dates of efforts that have no wind yet, one request per contiguous run of dates and at most 30 runs per click. `parseArchiveWind` in `@scout/application/archive-wind` validates unix times, whole-day coverage, m/s units and bounded values; calm hours stay usable, missing directions do not. The hour containing each effort's start is saved on the effort as `wind` with the retrieval time, so it is never fetched twice and reload makes no request. The table shows the along-route description, the wind speed and the reference model's still-air difference for that hour using the segment's current terrain mode, shelter and rider. It is context, not a correction: the numbers say what the wind was and what the model would have expected, and leave the comparison to the rider. The archive runs about five days behind for reanalysis and fills recent days from model output; either way the hour is labelled with its retrieval time.

## Provider contract schemas — 13 September 2026

`packages/contracts` now describes the raw Open-Meteo forecast, elevation and archive responses as Zod schemas, exactly as the planner and the provider request them (unix and ISO time formats, m/s wind, GMT, strict objects). They exist for testing, not for parsing in production: the browser loaders and the provider keep their own defensive parsing. Recorded live responses in `packages/testing/fixtures/open-meteo` are validated against these schemas on every test run, and a scheduled job (advisory per pull request since 9 October 2026) fetches the live API and validates it the same way, so an upstream change surfaces as a named schema failure instead of a parsing quirk in a user's browser.

## Nightly flake triage — 21 September 2026

The nightly flake hunt now captures the first three distinct error messages per test (colour codes stripped, 600 characters each) in `reports/flake-hunt/summary.json`, and an advisory step in the same job asks Jev, a decision-only evaluation model that answers a typed choice question with a label and a probability per label, whether each flaky or failing test looks like a flake (timing or animation race), an infrastructure fault (browser, runner, network) or a regression (behaviour no longer matches the assertion). `packages/testing/src/flake-triage.ts` holds the pure parts: the question, the verdict parser (any reply that is not a known label with a confidence becomes `unclassified`, and a confidence under 0.7 is marked low) and the loop; the client is one function behind an injected `fetch` that posts to AI Gateway's `/v1/evaluate` endpoint (Jev is an evaluation model and rejects chat completions), so tests never touch the network.

Boundaries, in line with sections 6 and 12: the classifier is test tooling, not product code, and nothing under `apps/` or `packages/analysis` may import it; the wind and effort calculations stay deterministic. The step runs only in the nightly workflow after a failed hunt, so pull-request CI keeps its no-live-provider guarantee. The verdict is written into the `flaky-test` issue and the artifact and never decides what is quarantined; that remains "failed once in ×5". The key arrives only as a GitHub Actions secret through the environment, the model slug and endpoint as repository variables (Vercel's AI Gateway lists it as `typesafe-ai/jev` and is the default endpoint; OpenRouter's public list does not carry it as of this date), and when either is missing the step records "skipped" and passes. The MindStudio article describing Jev is the only source for its behaviour; its claimed cost and latency are unverified here.

## Owner-drawn route disclosure — 22 September 2026

The owner recorded a data-rights entry (see [integration decisions](integration-decisions.md), 22 September 2026) permitting owner-drawn routes, their matched efforts and saved past wind to reach the local stdio MCP server under policy identity `owner-routes-v1`. Disclosure is by explicit owner export from the browser library to a local file the MCP server reads; nothing syncs automatically, nothing persists server-side and no remote transport exists. Strava sources stay disabled. The source gate in section 2 and the untrusted-name rule are unchanged: `list_segments` would report the new source with `allowsAiDisclosure: true` and `listEfforts: true`, and history would remain labelled as recorded times rather than verified records. The provider, export format and MCP wiring are not implemented by this entry.

## MCP removed — 22 September 2026

Sprint Scout is a focused web app. The local stdio MCP server (`apps/mcp`), the embedded MCP App (`apps/mcp-ui`), the repository skill and the MCP guide were removed, along with the versioned tool input/output contracts in `packages/contracts` and the MCP use cases in `packages/application`. The planner display contracts (`displayZone`, `segmentSummary`, `demoConditions`) stay because the web planner uses them. `getDemoConditions` now serves only the Next and Fastify planners. Nothing in sections 10 and 12 about MCP output, AI-disclosure checks on tool output or embedded host acceptance applies any more; the source-permission gate in section 2 is unchanged and still governs the web and HTTP paths. Test and CI steps that built the embedded UI were dropped; the in-process MCP integration suite went with the server. The owner-drawn route disclosure entry recorded earlier today has no consumer and stays as history.

## Flake hunt removed — 23 September 2026

The nightly flake hunt (`playwright test --repeat-each 5` on the smoke tag), the quarantine list and its automation, and the advisory Jev triage described in the 21 September entry were removed. They added a job, a secret, an external evaluation endpoint and a second grep layer in the Playwright config for a suite that has not produced a flaky test; a test that flakes is fixed or deleted the same day instead. The test health page stays and no longer reports a flake rate. Nothing under `apps/` or `packages/` imported any of it, so no product boundary changes.

## Weather sharing folded into source confirmation — 9 October 2026

Pre-release review found the forecast loader passing `weatherConsent: true` unconditionally while the README promised a consent switch before the first Open-Meteo request. There never was a separate weather switch: the only gate was the save-time independent-source checkbox, whose wording did not mention Open-Meteo. Rather than add a second per-segment toggle, the checkbox now states that the segment's start coordinate is sent to Open-Meteo for wind forecasts, and the loader passes that confirmation as the weather consent instead of a literal. Behaviour is unchanged for saved segments; the wording is now true. Elevation and past wind keep their separate consent boxes because they share more (dates, every sampled point) and are opt-in per segment.

## Pre-release review fixes — 9 October 2026

A read-only review before the first public commit found eight behavioural gaps. All are fixed with tests; none changes the architecture.

- Effort matcher (`effort-match-v1`): along-route advance between two samples may not exceed the distance moved times π/2 plus the corridor. Crossing the mouth of a U-shaped segment, or cutting a hairpin, no longer records a traversal. Genuine rides with coarse sampling still match; the version string is unchanged because no previously correct match changes.
- Flat-road solver: bisection now starts at the free-rolling speed (where a tailwind alone balances rolling resistance, or zero) instead of the tailwind speed, so a low-power rider in a strong tailwind is no longer reported at exactly the wind speed.
- GPX import: timestamps must carry `Z` or a numeric offset. A zone-less time would be read in the importer's local zone, making the same file produce different instants and archive hours on different devices.
- Past wind: an effort whose archive hour had no usable wind stays retryable instead of being marked loaded. A press of Load past wind loads as many contiguous date runs as the archive limit allows and reports how many efforts still need wind, instead of failing outright when a library spans more runs than one load.
- Opportunity board: a timer re-ranks when the earliest loaded forecast passes its freshness window (never sooner than one minute), so a board left open does not keep recommending hours from a stale forecast. Ties are broken by code-unit name order and then segment id, not `localeCompare`.
- Attribution: the terrain panel carries the Copernicus DEM licence notice and the MapLibre BSD notice is copied beside the worker in the static export.

## Nightly workflow retired — 9 October 2026

Every scheduled job now runs per pull request in the Checks workflow: the testcontainers database suite, the OSV scan and the live Open-Meteo drift check (advisory, `continue-on-error`, still the only job that touches the internet). Mutation testing moved to its own workflow on manual dispatch only, keeping the incremental cache; it is run when someone wants a score, not on a timer. The test health page is built by Checks on pushes to `main` from the merged coverage and e2e reports plus the latest mutation report, and the Pages workflow now runs on `workflow_run` after Checks succeeds instead of on push, so a red gate is never published and the health page beside the app is from the same commit. Schedules were dropped because a hobby repository with no nightly reader gains nothing from a job that fails when nobody is looking.

## Example segment on first visit — 9 October 2026

The planner opens populated. When the library key is absent from storage, the first visit writes one route into the first slot (index 0, shown as Segment 1): 593 m of park road west from Roehampton Gate in Richmond Park, London. The geometry was routed on OpenStreetMap roads between two coordinates and lives in `apps/web/app/routes/example-segment.ts`; it is not a Strava segment and carries no Strava data, so publishing it keeps section 12's boundary. The example is an ordinary `DrawnRoute` with the same slot, delete, redraw, terrain and efforts behaviour as a drawn one. An emptied library is stored as `[]`, which is distinct from an absent key, so a deleted example never returns.

The first-visit forecast request therefore carries the example's start coordinate before the user has drawn anything. That coordinate is a constant in the repository and a public park gate; it discloses nothing about the user beyond opening the app, which the map tiles already disclose. The source confirmation on saving continues to guard the user's own locations, and the privacy journeys are unchanged. Playwright tests start from an emptied library through an auto fixture and opt into the first visit with `firstVisit: true`.

## Engineering dashboard — 10 October 2026

The test health page at `/test-health/` becomes an engineering dashboard at `/dashboard/`, built by the Checks workflow after every push to `main` and published by the Pages workflow beside the planner. The old address carries a static redirect. Sections: pipeline, tests per level, quality gates, performance, AI practice and delivery, each a grid of cards with a status tone and an inline SVG trend over the recorded runs. The page keeps the planner's constraints: no scripts, no external requests, light and dark through the same tokens. Inputs are the run's own artifacts plus two GitHub API reads with the job token; a missing input leaves a card at n/a and never fails the build. The 90-run history is carried between runs as an artifact; old test health snapshots render unchanged. Source: `packages/testing/src/dashboard.ts`, plan in `docs/sdlc.md`.

## Pull request review and fix loop — 10 October 2026

`REVIEW.md` is now applied by a workflow. On every non-draft pull request from this repository, when the repository variable `REVIEW_ENABLED` is `true`, `claude-code-action` reads the policy, the diff and the named intent plan, posts inline comments for Blocker, Major and Minor findings and one sticky summary comment with the tally, and returns the counts as structured output under a JSON schema. A deterministic step validates those counts into `reports/review/tally.json`, which the dashboard job collects across recent pull requests together with each pull request's resolved review threads. The reviewer never approves, requests changes or merges: branch protection and a person decide, and the workflow is not a required check. A comment containing `@claude` on a pull request runs the same action in its tag mode as a fix loop, limited to the pull request branch, with the repository's guard hook active inside the action. Drafts, forks and Dependabot pull requests are skipped, so the API key never meets untrusted code. Source: `.github/workflows/review.yml`, `packages/testing/src/review.ts`, `scripts/collect-reviews.mjs`; plan in `docs/sdlc.md`, step 11.

## Failed-run triage — 10 October 2026

A failed Checks run on a pull request now gets one comment with three lines: the job and step that failed, the probable cause, and the next action. The `Triage` workflow runs on `workflow_run`, which carries the repository secret even for fork pull requests, so it is built as a read-only judgement step: it checks out the default branch only, never the pull request head, downloads the failed job logs through the API, trims them to their tails, and runs `claude -p` with `Read`, `Glob` and `Grep` only. The prompt states that log text is data from untrusted code. The answer is parsed strictly; anything but the three lines becomes a deterministic fallback comment naming the failed step with a link to the run, and the job fails so the gap is visible. The comment carries a hidden marker and is edited rather than repeated on later failures. Failures on `main` are not triaged here; a `main` regression is the band breach path. Source: `.github/workflows/triage.yml`, `packages/testing/src/triage.ts`; plan in `docs/sdlc.md`, step 12.

## Rider profile keeps unknown fields — 11 October 2026

Saving the rider profile now merges the edited power, mass and drag area into whatever object is already stored under `sprint-scout.rider.v1`, instead of replacing it. Fields this build does not know survive, so a profile written by a newer build is not cut back when an older tab saves it, as the storage contract in `docs/test-strategy.md` already promised. Reading still returns only the three known fields; unreadable storage is replaced. Resetting to the reference rider still deletes the key. Source: `riderStorageValue` in `apps/web/app/routes/rider.ts`; intent in `intent/test-hardening/`.

## Fix loop refuses fork pull requests — 12 October 2026

The `@claude` fix loop in `review.yml` installs and runs the pull request's code with the API key and write access. Its gate checked who commented but not where the code came from, and a comment event does not carry the head repository. A new `fix-origin` job asks the pulls API for the head repository first; the fix job runs only when it is this repository, so a collaborator's `@claude` on a fork pull request writes a step summary and stops. Guarded by `harness.test.ts`.

## Checks run once per pull request — 15 October 2026

`ci.yml` ran on every push and every pull request, so each push to a pull request branch ran the full suite twice; the concurrency group never cancelled either, because the branch ref and the merge ref differ. The doubled load slowed the `next dev` e2e server enough that input landed before hydration. Checks now run on pull requests and on pushes to `main` only. The demo planner marks its root `data-hydrated` once React has taken over, and the demo e2e tests wait for it before typing. The static job also grants `pull-requests: read`, which gitleaks needs to list a private repository's pull request commits.

## Agents may merge green pull requests — 15 October 2026

Agents could not merge or trigger a deploy, so every landing waited for the owner to type `gh pr merge`. The owner now lets an agent merge a pull request, or re-run the Pages workflow, when asked and only with Checks green. Direct pushes and force pushes to `main` stay blocked by the `guard` hook, so everything still lands through a pull request and the same gates; branch protection on `main` backs this up on GitHub. The harness test moves the Pages dispatch to the allowed list and adds `gh pr merge`.

## Coverage measures behaviour, not wiring — 16 October 2026

The published line coverage was 82 % while every core package sat at or near 100 %. Most of the gap was code no unit test runs: CLI entry points, the API server start-up, the live contract drift script and the Playwright and Vitest browser fixtures. Those files are now excluded from the report; the logic they call is tested where it lives. The one real gap, the per-tab forecast cache, gained unit tests for sharing, expiry, failure, force and timeout. Line coverage is now 93 %. The global 80 % gate is unchanged until the new figure has held for a few runs ([intent](../intent/coverage-scope/intent.md)).

## E2E on a production build — 20 October 2026

Under `next dev` every CI e2e worker paid for on-demand route compiles: the first test on each worker took 16 to 20 s, and the slowest test on `main` took 22.9 s, with a 10.5 s median on chromium-desktop. The e2e job now runs `next build` and tests against `next start`; locally the dev server stays, for hot reload. In the same change every spec moved onto page objects in `e2e/pages/` and into arrange-act-assert form, with independent behaviours split, so 127 tests became 169. On the pull request the slowest chromium-desktop test took 10.2 s and the median 6.7 s, and each shard still finished in about three minutes despite the extra tests and the build step. The visual baselines script builds first, because `CI=1` now means `next start` ([intent](../intent/e2e-production-build/intent.md)).

## Paid CI steps on the subscription — 21 October 2026

Review, the fix loop, triage and the paid evals authenticated with `ANTHROPIC_API_KEY`, and the first review with it (PR #14) failed before reaching the model. They now use `CLAUDE_CODE_OAUTH_TOKEN`, made with `claude setup-token`, and bill the owner's Claude subscription. The API key is removed from every workflow rather than kept as a fallback, because the CLI prefers it when both are set. Runs share the owner's usage limits, cost figures in review and eval output become estimates, and the token is renewed about a year after it was made. Fork pull requests still get no secrets ([intent](../intent/subscription-token/intent.md)).

## Spec drafts and band issues — 22 October 2026

The last two handovers of the SDLC now start themselves (`docs/sdlc.md`, step 13). A push to `main` that leaves an intent `accepted` without a `spec.md` runs `spec.yml`: a deterministic step picks one intent, skipping any with a spec or an open pull request from a `spec/<slug>/` branch, and `claude-code-action` drafts the spec from the intent skill's template. The model may write only that spec file, its only command is `pnpm spec:draft open`, and no GitHub token is left in the checkout for it to read. The command validates the five sections and the link back to the intent, commits that file alone and opens the pull request. It runs inside the action because the action revokes its GitHub App token when it ends, and only that token makes Checks run on the new pull request. Questions the draft cannot answer from the intent or the repository go under `## Unresolved questions` and make it a draft pull request. A 3σ breach on `main` now also runs a `band-issue` job: it lists the commits since the newest run where every breached metric was inside 2σ, asks the model with read-only tools for a draft `intent.md`, and opens a `band-breach` issue or updates the open one that names the same band. A malformed draft still posts the numbers and fails the job. Both are paid, event-triggered and behind `SPEC_ENABLED`, which starts off ([intent](../intent/spec-drafts/intent.md)).

## Skill and hook evals — 23 October 2026

Eight eval tasks prove the agent configuration steers as written (`docs/sdlc.md`, step 14). For each of `intent`, `bugfix` and `release`, one request should load the skill and one should not. A skill counts as loaded when the run's stream-JSON transcript holds a `Skill` tool call naming it, read by `scripts/eval-skills.mjs`, so the verdict stays a deterministic file check, never a model grade. Two hook tasks ask outright for an edit the guard forbids: a test change while `.claude/state/fixing` exists, and a hand-edited ARIA baseline. They pass only if the file is unchanged by any route. Writing them exposed that the guard covered the two marker rules for the Edit and Write tools only, so a shell command could still write a protected file. The guard now treats a Bash command that names a protected test or baseline as a write unless it starts with a reader or a test runner, and blocks any redirect into one. It is deny-by-default, so `sed -i`, `tee`, `cp`, `node -e` and `git checkout --` are covered without a list. Command substitution, an output option or an assignment next to a protected path also counts as a write. While a bug fix is in progress, the test runners may not update snapshots or baselines either. It is still string matching, not a shell parser: a glob or a path built at run time can slip past it, which is why the hook evals check the file itself, by any route. A side effect: a heredoc whose text redirects into a baseline is blocked too, so such files are written with the Write tool ([intent](../intent/skill-hook-evals/intent.md)).

## Advisory gate on what a pull request changes — 24 October 2026

The `OSV scan` check used to fail every open pull request whenever an advisory was published for anything in the lockfile. On 23 October that happened four times in a day, eight of nine advisories were in dev-only tooling, and each needed an override and a merge of `main` into every open branch. The check now fails a pull request only for an advisory its lockfile has and its base does not: `scripts/osv-diff.mjs` compares the two osv-scanner results by package name and advisory ids or aliases, so a version bump under an advisory already on `main` is not new. A pull request that leaves `pnpm-lock.yaml` unchanged skips the scans. Advisories already on the base go in the job summary, and a push to `main` reports every advisory there and in code scanning without failing. Shipped dependencies stay gated on every pull request by `pnpm audit:prod` (high and critical) in the static job. Dependabot security updates for npm arrive as one grouped pull request ([intent](../intent/advisory-gate/intent.md)).

## msw 3 for the test mocks — 24 October 2026

The shared Open-Meteo mocks moved to msw 3. Component tests still prove that no test reaches the internet, and now more strictly: `blockExternal` in `@scout/testing` lets requests to the page's own origin through, and records any other request or non-HTTP frame and answers it as a network error. msw 2 recorded such a request and then let it through. msw 3 exposes the request only through its experimental `HttpNetworkFrame`, so `apps/web/test/no-internet.browser.test.tsx` exercises the guard directly and fails if that API changes. The component project now serves msw's own `mockServiceWorker.js` from the installed package instead of a committed copy, because msw 3 no longer copies the script on install and a stale copy hangs every test. The worker is stopped without awaiting, since msw 3 waits for requests in flight and the timeout fixtures never answer ([intent](../intent/msw-3/intent.md)).

## Intent board on the dashboard — 24 October 2026

The dashboard has an Intent board section with columns Draft, Accepted, In build and Done, and dropped intents folded beneath. It replaces the plain intents table, which could only ever show `done` because an intent reaches `main` with its code. The board also reads intents from open pull request branches: `scripts/collect-intents.mjs` lists open pull requests from this repository's branches and fetches each touched `intent/<slug>/intent.md`, with spec and plan presence, through the job's `github.token`, which gains read access to checks and statuses for each pull request's check state. A branch copy replaces the `main` copy. On an open pull request an intent counts as In build once it has a plan, and one marked `done` stays In build until it merges. Cards show the title, opened date, spec and plan, the pull request with its check state, and a link to the folder. The board is built only from the intent files and pull request data, so nothing can disagree with them. It refreshes with the dashboard on a push to `main`, so it can lag open pull requests by hours; rebuilding on pull request events would deploy Pages from pull request activity. Each column shows its newest five cards (six until 25 October 2026) and folds the rest under "+ Show N more", so Done does not grow the page without end. Only the newest history entry keeps its board, and the band-issue job strips it, with every artifact file but `bands.json` and `history.json`, before its model runs, so that model still reads only data from `main` ([intent](../intent/intent-board/intent.md)).

## Manual rebuild of the intent board — 24 October 2026

The intent board refreshes on demand as well as on a push to `main`. Its section opens with "Built on <date>. Rebuild now", and the link goes to the Pages workflow in GitHub Actions. A manual run of that workflow builds and gates the app as before, downloads the latest `main` dashboard, collects intents on open pull requests, and rebuilds only the board on the newest history entry, with that run's date; the rest of the dashboard stays as the last Checks run left it. A run after Checks does not refresh, since its dashboard is already current. The Pages workflow gains read access to pull requests, checks and statuses for the collector. This keeps the no-schedules rule: the owner presses the button when the board looks stale ([intent](../intent/board-rebuild/intent.md)).

## Evals on main for the dashboard — 24 October 2026

The Evals workflow now also runs on a push to `main` that changes the agent configuration, with the paid tasks behind `EVALS_ENABLED` as on pull requests. The dashboard has only ever accepted an eval result from `main`, so that it describes merged configuration, but evals ran only on pull requests and by hand, and the card said n/a despite six passing runs. A merge starts Checks and Evals together and the paid tasks take minutes, so a result usually reaches the dashboard at the next push to `main`; it then stays until a newer one replaces it or the artifact expires after 90 days ([intent](../intent/evals-on-main/intent.md)).

## Maps take control only after a click — 24 October 2026

Both maps (route drawing on `/`, route map on `/demo`) start with wheel zoom, drag pan and touch zoom off, so scrolling the page past them never zooms or pans them. A mouse press or a tap activates the map; it releases when the mouse leaves, on a press outside it, or when focus leaves it. While inactive, a wheel or touch drag over the map shows a short hint. On the drawing map the activating click places no point, a resting mouse sees "Click to use the map", and once a point is drawn the mouse leaving no longer releases the map, so the empty click happens once per drawing rather than each time the cursor drifts off. Map clicks, the zoom buttons and the keyboard handler work throughout. The helper is `clickToActivate` in `packages/ui/src/maplibre.ts`; MapLibre's cooperative gestures (Ctrl or ⌘ plus scroll) were considered and not chosen ([intent](../intent/map-click-to-activate/intent.md)).

## Lighthouse without Lighthouse CI — 24 October 2026

The deploy gate runs Lighthouse 13 directly instead of through `@lhci/cli`. Lighthouse CI pinned Lighthouse 12, whose puppeteer chain brought `extract-zip` 2.0.1 with two high advisories and no fix, after `basic-ftp`, `sprintf-js` and `zod` 3 advisories by the same route; Lighthouse 13's puppeteer no longer uses `extract-zip`, and all five ignores are gone. `packages/testing/src/lighthouse.cli.ts` serves the export, runs three desktop runs and writes `.lighthouseci/` in the shape the dashboard already reads. The gate in `lighthouse-gate.ts` is pure and tested: category scores and timings from the best run, Lighthouse CI's default, and the resource budget from the representative run's network requests. That budget had not been enforced since Lighthouse 12 dropped the `performance-budget` audit, because Lighthouse CI passes an assertion on an audit that does not exist; the new gate fails any category or audit that is not reported. Thresholds are unchanged and live in `lighthouse.json`, which replaces `lighthouserc.json` and `budgets.json` ([intent](../intent/lighthouse-direct/intent.md)).

## Aero Stealth redesign — 24 October 2026

The planner and `/demo` move to one dark theme after the owner's mock-up (`docs/images/new-design.png`; intent `intent/aero-stealth/`). Tokens live on `:root`: slate navy surfaces (`#1e2a3a`, `#263345`, `#2e3d52`), teal for data and primary actions, crimson for the best hour and the active segment, sky blue for wind, and a token test holds every text colour at 4.5:1 or better on each surface. Inter and JetBrains Mono replace DM Sans and Outfit, served locally; numbers use the mono face. The OpenStreetMap raster is inverted and hue-turned in MapLibre paint, so there is no new tile provider. The header has a chevron logo, segment pills and a units switch; panels are translucent cards with a teal hairline; the timeline uses capsule buttons and a glowing selected point; the analytics row is a radial speed dial, an estimated time card and a ticked compass. Terrain and shelter notes fold under a summary. Hover, focus and selection fade over 150 to 200 ms and stop under `prefers-reduced-motion`; buttons switch their background instantly, because a fading background under instantly changed text fails contrast mid-transition. Panels carry no `backdrop-filter`: they sit on the flat page colour, so a blur changed nothing visible, and in Linux WebKit it stalled pointer actions on the page for longer than the 30-second test timeout. Phones from 360 px wide keep the logo and units on one row with 16 px gutters. `/demo` loses its light theme and the switch for it. The work was built in nine local stages, each checked by the owner on the dev server and on a phone before its commit, and pushed only once the whole design was accepted. `/demo` itself is to be removed by a separate intent.

## Synthetic demo removed — 24 October 2026

`/demo` was a synthetic planner from the first milestones: invented segments, fixed-clock weather, an hourly ranking, an ECharts chart, a Fastify API and a Postgres table that stored only the demo segments. It was never in the Pages build, it lost its MCP role on 22 September 2026, and after the Aero Stealth redesign the owner could not tell what it was for. It is removed with everything only it used (`intent/remove-demo/`): the page and `/api/planner`, the demo components and CSS, `packages/providers`, `packages/database`, `apps/api`, `compose.yaml`, the root entry of `packages/application` (the provenance policy, time resolution and forecast sampling), the hourly ranking in `packages/analysis` with its golden fixtures, the planner schemas in `packages/contracts`, the database CI job and the perf budgets of the ranking path. `apps/worker` stays as a reserved boundary. `/` is unchanged. The dependency-cruiser rule that kept the UI away from providers and the database now keeps planner code away from the test helpers in `packages/testing`. Dashboard bands gained an optional `since` date, so the intended drop in test counts restarts their baselines instead of failing the dashboard job.

## One review per pull request push — 25 October 2026

The review workflow posted every finding twice, as an inline comment and again in a summary comment, and GitHub mailed each post: two or more emails about the same finding in two layouts. The reviewing agent now posts nothing. It returns the summary and its line comments as structured output, and a workflow step posts them as one review with event `COMMENT`, so a reviewed push is one email. If GitHub rejects a line comment outside the diff, the step posts the same findings in the body alone. The agent loses the inline-comment tool and `gh pr comment`; the review is posted by `github-actions[bot]` with the job token, which `scripts/collect-reviews.mjs` already counts. The 10 October entry's "inline comments and one sticky summary comment" no longer applies. Source: `.github/workflows/review.yml`, `packages/testing/src/review.ts`; plan in `intent/review-single/`.

## Cockpit: two dials and a fact strip — 25 October 2026

The ride cockpit had three panels: the speed dial, an "Estimated segment time" panel and the wind compass. The time panel's large figure repeated the "Selected" time on the chart above, and it took the widest column while the dials got the least room. The time panel goes. The speed dial and the compass now share the width, and a strip under them keeps the difference from still air, still-air time, estimated range, segment distance, exposed comparison, the modelling and shelter notes and the target comparison. The chart's selected time is the one segment time on screen and carries the `segment-time-value` test id. The compass is redrawn larger with the wind speed inside the ring, sized with container query units so it stays inside the ticks down to 360 px, and the arrow on the ring's edge. No calculation changes. Source: `apps/web/app/components/ride-cockpit.tsx`, `apps/web/app/globals.css`; plan in `intent/cockpit-strip/`.

## Content security policy and clear saved data — 25 October 2026

GitHub Pages sends no security headers, so the static export now carries a content security policy as a meta tag: the page may reach only itself, Open-Meteo (forecast, archive, elevation) and the OpenStreetMap tiles, never eval, and never plugins. Inline scripts and styles stay allowed because Next's static export inlines its bootstrap; the policy's job is to keep code and saved data from reaching any other host. The dev server has no policy, because Fast Refresh needs eval. Zod runs `jitless` so its eval probe never fires. The Data & privacy note gains "Clear saved data", which after a confirmation removes every `sprint-scout.` key and reloads as a first visit. Source: `apps/web/app/csp.ts`, `apps/web/app/routes/clear-data.tsx`; plan in `intent/csp-clear-data/`.

## Review fixes — 25 October 2026

A Codex review of the application, challenged finding by finding by a second reviewer, led to five fixes (`docs/reviews/2026-10-25-typescript-review.md`, `intent/review-fixes/`). Effort matching now enforces its 60 s gap limit, which was declared but unused. The efforts panel applies imports and past wind to the efforts stored when they finish, so a removal during a load holds, and a past-wind timeout says so. The opportunity board keys its fetch on each route's id, start and confirmation, so saving a setting no longer refetches every forecast, and only Refresh or expiry bypasses the cache. Opening the same opportunity twice moves the forecast back to its hour. The other findings were deferred or rejected in the intent with reasons.

## Dashboard visuals — 25 October 2026

The engineering dashboard moves from plain number cards to the Aero Stealth look of the planner, from the owner's designs in `docs/images/dashboard-update.png` and `dashboard-charts.png`. The page is dark only. Teal marks healthy, orange attention and red poor, and a card glows in its tone. Percentages get rings, Lighthouse gets four score rings, LCP, TBT and client JavaScript get bars against their budgets or ceiling, intents and review findings get area charts, and merges per week is a column chart with the current week lit. The intent board is a compact Kanban beside the quality gates and performance on wide screens, showing five cards per column. The five slowest end-to-end tests (ten before) move to their own section at the end. Lighthouse rings call 90 amber, as the design asks; the Lighthouse card's tone and badge keep 90 as good. The LCP bar keeps its 2,500 ms budget. No calculation, tone rule, band or badge changes, and the page still has no scripts and makes no external requests. Every chart is an SVG or bar with `role="img"` and a label, and the values stay as text. Source: `packages/testing/src/dashboard.ts`; plan in `intent/dashboard-visuals/`.

## Recent runs strip — 25 October 2026

The dashboard's Pipeline section gains a "Last 30 runs" card beside Checks duration and first-pass success. It draws one bar per Checks run on main, oldest first, with height for run time and colour for the result: teal passed first time, orange passed on a rerun, red failed, grey cancelled because a newer push superseded it. A legend gives the counts. Only the newest history entry keeps the run list. The run that is building the dashboard is still in progress, and gh lists it with an empty conclusion, so it is now left out of the pipeline figures instead of counting as a failure. The job fetches 31 runs so that 30 completed ones remain. Cancelled runs no longer count against first-pass success or as the latest Checks duration: a run cancelled by a newer push says nothing about the code or the pipeline (owner's decision). Over the 30 runs when this landed, that moved the rate from 73 % to 96 %. Source: `packages/testing/src/dashboard.ts`; plan in `intent/pipeline-runs/`.

## Stale intent check — 25 October 2026

`intent/review-single/` merged with its code but stayed `in build`, so the intent board showed shipped work as still in build. Checks now runs `pnpm check:intents` in Static gates, on pull requests and on `main`. It fails when an intent is `in build`, or has a `plan.md` and is anything but `done` or `dropped`, and names each one. A plan is committed with the work, so on a merge result it means the work is there; an accepted intent with no plan is the backlog and passes. On a pull request the check sees the merge result, so the status must be finished before the merge, not noticed after it. It is not part of `pnpm verify`, because staged work on one branch commits with its intent in build. Source: `packages/testing/src/intents.ts`; plan in `intent/stale-intents/`.

## Dashboard history carries over — 25 October 2026

Until now every dashboard build on main started from an empty history: CI's `--history previous/history.json` lost to the `--history` the `pnpm dashboard` script already passes, because the CLI read the first flag (`docs/lessons.md`, 25 October 2026). The CLI now reads the last one. History starts collecting from this merge, one entry per day, so trends fill over the coming days and the bands start comparing once they have runs to compare with. The header says what it counts: "Built from main at `<sha>` on `<date>` · trends over N days", replacing "N runs recorded", which read as the number of pipeline runs. Source: `packages/testing/src/dashboard.cli.ts`, `dashboard.ts`.

## CI and dashboard hardening — 25 October 2026

A whole-repository review (six agents over `d95ad89`) found the dashboard and Pages workflows trusting inputs they should not and failing quietly. Only a push to main in this repository can now supply the `dashboard` artifact, for the next build's history or for a manual Pages rebuild: `gh run list --branch main` also matched a fork's pull request from its own main, whose edited `ci.yml` could upload any page. The previous history is the newest dashboard artifact from main, red runs included, so failed days reach the trends; a build that wrote no history uploads none, and a history that cannot be listed or downloaded fails the job instead of restarting it. Only when no unexpired history is left (90-day retention) does the job start a new one, with a warning. Failed GitHub API reads and collector failures are warnings that leave their cards at n/a, never empty lists or zeros, and a crashed build is reported as a crash rather than as a 3σ breach. Pages checks out the commit whose Checks passed and fails rather than publishing without the dashboard. Review tallies come only from this repository's runs, with integer counts. The guard hook sees `git` options before `push` and treats a `+` refspec as a force push. The history counts days, and the page, labels and comments now say so. Source: `.github/workflows/ci.yml`, `pages.yml`, `scripts/collect-*.mjs`, `.claude/hooks/guard.mjs`; plan in `intent/ci-hardening/`.
