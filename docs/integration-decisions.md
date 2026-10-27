# Integration decisions

Assessed 2026-09-07. Default: synthetic demo only. Repository inspection found only AGENTS.md and the two specification documents, no Git repository or application code. Existing instructions are preserved.

## Source and usage matrix

These are application enablement decisions, not blanket legal permissions. Unknown means denied in this application.

| Source                                             | Geometry                                | History                     | Analytics                                     | Storage                        | Derived outputs                  | AI disclosure                                            |
| -------------------------------------------------- | --------------------------------------- | --------------------------- | --------------------------------------------- | ------------------------------ | -------------------------------- | -------------------------------------------------------- |
| Original synthetic fixtures                        | Enabled                                 | Synthetic only              | Permitted; engine delivered (milestone 2)     | Enabled                        | Permitted                        | Permitted                                                |
| Independently created routes/original device files | Enabled: owner-drawn, source-confirmed  | Enabled: own recordings     | Permitted locally                             | Browser storage; local export  | Permitted, attributed            | Not applicable: no MCP or AI surface (22 Sep 2026)       |
| Strava REST                                        | Disabled                                | Disabled                    | Denied for proposed workflow                  | Disabled                       | Disabled                         | Disabled                                                 |
| Official Strava MCP                                | Segment capability unverified           | Advertised activity history | Advertised personal workflows only            | Local persistence unverified   | Proposed weather join unverified | Official personal workflow advertised; this app disabled |
| Strava exports                                     | Disabled; not automatically independent | Disabled                    | Unknown                                       | Unknown                        | Unknown                          | Unknown                                                  |
| Open-Meteo                                         | Not a segment source                    | Not effort history          | Enabled: personal, non-commercial, attributed | Browser-only cache, attributed | Attributed weather results       | Enabled (see the entries below)                          |

## Evidence reviewed

- [Strava API Policy](https://www.strava.com/legal/api_policy), sections 3.5, 5.3–5.5, 5.7, 5.16, 6.2–6.4: official personal MCP exception; restrictions cover analysis, derivatives, AI and custom agent interfaces. Seven-day transient caching does not authorize the proposed processing. Decision: no REST integration, proxy, imports or credentials.
- [API Agreement](https://www.strava.com/legal/api), effective June 1, 2026, sections 1, 2.2, 4.4, 6 and 9: registered purpose, uncertain-use clarification, termination/deletion, security and reserved rights. No approval has been sought or obtained.
- [API reference](https://developers.strava.com/docs/reference/), Segments and SegmentEfforts: endpoints exist; effort retrieval is subscription-dependent and exploration requires granted Extended Access permission. Endpoint availability does not establish usage permission or complete history.
- [Getting started](https://developers.strava.com/docs/getting-started/), authentication and application setup: OAuth/application registration would be required for REST; neither was performed.
- [Official MCP connector help](https://support.strava.com/en-us/articles/15401531-strava-mcp-connector), Connect and FAQs: subscriber rollout began June 1, 2026, initially Claude; read-only personal activity history, fitness, readiness, goals, cross-sport and gear advertised. No verified tool schema for ordered segment geometry or weather joins. No account connected.
- [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview): embedded resources require supporting hosts. Intended host is unspecified, so embedded UI is unverified; standalone web remains the fallback. No MCP implementation in milestone 1.
- [Open-Meteo docs](https://open-meteo.com/en/docs), hourly variables, units and timestamps; [terms](https://open-meteo.com/en/terms), API usage and attribution: retain attribution, verify applicable service limits before live use. Foundation makes no weather requests and uses no weather credentials.

## Exact blocked workflow

Collect directed Strava segment geometry and personal effort history, join hourly weather, rank assistance, retain raw/derived data in PostgreSQL and disclose results through a custom MCP/embedded UI. Permission for this complete workflow is not verified. Official MCP access alone does not resolve those boundaries. Any later approval must identify source, operations, retention, derived outputs, disclosure and host. No third parties were contacted.

## Fixture provenance

The demo fixture coordinates are manually invented longitude/latitude pairs around (0, 51), with fixed synthetic timestamps and invented effort durations. They are not downloaded routes, recordings, Strava examples or representations of rideable roads. Weather is fixed synthetic data, never a current forecast. No personal information or credentials are included.

Milestone 0 acceptance: demo work requires no uncertain source. Lint/typecheck/tests were unavailable before scaffolding (no package manifest); documentation and source links reviewed. Proceed to milestone 1 only.

## Milestone 3 weather decision — 8 September 2026

Reviewed [Open-Meteo terms](https://open-meteo.com/en/terms), Non-Commercial Use, and [licence](https://open-meteo.com/en/licence), API data/attribution. The free service permits private non-commercial use, subject to its published limits (under 10,000 calls/day, 5,000/hour and 600/minute). Data are offered under CC BY 4.0, requiring credit, licence link and identification of modifications. This decision permits the private demo's weather analysis, bounded in-memory caching and attributed derived/AI output. It does not authorize a commercial deployment or personal route disclosure.

Enabled policy identity: `open-meteo-demo-v1`, exclusively for weather. Live transport is disabled by default and its opt-in mode only accepts coordinates within longitude -0.001–0.011 and latitude 50.999–51.011, covering the invented demo routes. No credentials, personal routes or Strava data are sent. `/weather/demo` and the web preview replay original synthetic response fixtures with a clearly labelled fixed clock. They do not call Open-Meteo. The optional smoke command uses the single deliberately chosen coordinate (0, 51); it was verified to skip without its flag, and no live forecast was requested.

The adapter sends SI-unit requests to the fixed official endpoint with UTC hourly intervals, validates returned units/arrays, keeps requested and returned grid coordinates separate, and preserves attribution in snapshots and derived-source provenance. The service's 30-minute freshness and six-hour retention limits are application settings. No issue/model timestamp is inferred from retrieval or generation latency. Service terms must be revisited before deployment.

This supersedes the matrix's foundation-only Open-Meteo status. Strava and independent-file rows remain disabled. Synthetic analytics became available in milestone 2.

## Candidate official-MCP gateway — 8 September 2026

User-supplied candidate: [leecjohnny/strava-mcp-gateway](https://github.com/leecjohnny/strava-mcp-gateway). Read-only review of commit `7cd1c2820d3f9d97b04957d1d378aff0e01675da`: README, `strava.ts`, `worker.ts`, `web/login.ts`, and `docs/setup.md`. Nothing was installed, run, deployed or connected.

The implementation relays the official `https://mcp.strava.com/mcp` endpoint rather than building REST tools. It uses a hard-coded public OAuth client ID and localhost callback, a manual authorization-code handoff, and forwards Strava-issued tokens through the relay to its downstream client. It has no persistent token store, but this does not mean tokens are absent from the request path. The owner-only restriction required by this project is absent.

Its [setup documentation](https://github.com/leecjohnny/strava-mcp-gateway/blob/7cd1c2820d3f9d97b04957d1d378aff0e01675da/docs/setup.md) explicitly leaves the complete live flow unverified and acknowledges that passthrough does not meet [MCP token handling requirements](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#token-handling). No authenticated segment geometry/history tool schema was established by this review.

Assessment: a candidate connectivity approach to investigate, not an approved integration. [Strava policy](https://www.strava.com/legal/api_policy) 3.5 allows personal official-MCP usage; 5.16 and operational OAuth requirements still need reconciliation with this relay. No evidence establishes permission to reuse this client registration or to perform our geometry/weather join and storage workflow through it. Keep the existing gate closed pending workflow permission, a suitable authentication boundary and verified required capabilities.

## Milestone 5 MCP host status — 8 September 2026

The synthetic custom MCP server and embedded resource are implemented with the official v2 SDKs. Five read-only tools run over local stdio with registered-source AI-disclosure checks. This does not enable any Strava or live-weather path and does not execute the candidate Strava gateway.

The named tested environment is SprintScout AppBridge test host 0.5.0 in Playwright Chromium, using the official AppBridge and SDK client against the real local stdio server. It validates resource loading, local map assets, CSP isolation, scoped refresh and fallback behavior. It contains no language model and is not evidence of a working prompt-to-view flow in a desktop product. The user was asked to select a host; no choice or actual desktop acceptance run has been recorded. Host selection/verification was an open milestone 5 acceptance item until the 22 September 2026 withdrawal. The MCP guide was removed with the server on 22 September 2026.

The web fallback remains loopback-only synthetic mode, not an authenticated remote URL. Account/remote authentication is intentionally deferred to milestone 7. No client settings, accounts, paid services or deployments were changed.

## Allowed Strava workflow clarification — 9 September 2026

This is a public-documentation assessment, not an account connection or a new provider implementation. The clearly supported personal workflow is **the subscriber → official Strava MCP → the subscriber's AI conversation**. The SprintScout ingestion path remains disabled; these are different decisions.

The [connector guide](https://support.strava.com/en-us/articles/15401531-strava-mcp-connector) documents OAuth connection through Claude web/Cowork and a direct Claude Code HTTP connector. It advertises personal activity history, fitness, readiness, goals, cross-sport and gear questions. Access is subscriber-only, read-only and revocable; rollout/account eligibility has not been tested here. The [developer FAQ](https://communityhub.strava.com/developers-knowledge-base-14/strava-api-faq-12906) states that this personal MCP use needs neither app development nor application review.

The [launch announcement](https://press.strava.com/articles/strava-launches-mcp-connector), dated 1 June 2026, explicitly advertises activity GPS, per-second streams and cycling power. This improves the capability assessment: geographic activity analysis is advertised. It does not establish tools for starred segments, directed segment geometry, segment effort history or our weather join; no authenticated tool schemas were inspected.

[API Policy](https://www.strava.com/legal/api_policy) 3.5 permits personal use of one's own data through official MCP, including one's own AI application; 5.3 explicitly exempts that MCP usage from its AI restriction. Sections 5.4–5.5 and 5.16 still constrain analytics, persistent indexes and custom interfaces; 6.2 allows only limited transient caching. These do not establish permission for SprintScout's ingestion/storage workflow. The linked third-party gateway is not a Strava authorization grant.

There is a material documentation inconsistency: [getting started](https://developers.strava.com/docs/getting-started/) promotes activity weather enrichment and performance-analysis examples. The connector guide also discusses manual export/upload to Claude. Neither establishes approval for a separate custom MCP analysis service. Therefore this assessment does not label every personal export or every weather-related use categorically prohibited; the exact SprintScout workflow remains unresolved.

Decision: direct official-MCP personal conversations are documented as supported. Do not require bespoke approval merely for that workflow. To assess SprintScout, first verify whether the official connector exposes the necessary segment capabilities, then obtain an authoritative answer about passing those results to our deterministic weather tool and embedded view. [API Agreement](https://www.strava.com/legal/api) 2.2 directs uncertain use cases to <developers@strava.com>.

Unsent clarification draft: “For one subscriber's private use, may their AI client pass GPS/segment data obtained through official Strava MCP into a local deterministic tool that joins public weather, ranks along-route wind and displays an embedded map? Initially there would be no persistent storage or other users. Does this fall within the personal-MCP allowance? Separately, what retention of raw and derived data is permitted, and which official tools expose starred segment geometry and personal segment efforts?”

No message was sent, account authorized, gateway run or runtime permission changed. Milestone 5 host acceptance and milestone 6 source gates retain their existing status. Only this documentation changed; its formatting check passed. Runtime tests were not repeated for this research-only update.

## Independent route wind overlay decision — 9 September 2026

Allowed: owner-drawn, source-confirmed local routes with separate opt-in sharing of the start coordinate to Open-Meteo for its free personal non-commercial forecast. Browser-only hourly direction/speed preview, attribution and conversion notice displayed. No route name/full geometry disclosure, server persistence, or MCP/AI disclosure. Review based on [Open-Meteo terms](https://open-meteo.com/en/terms) and [forecast API](https://open-meteo.com/en/docs); provider may retain request logs containing coordinates for 90 days. Forecast stays in browser memory and expires after 30 minutes; changing/deleting selection cancels work and removes the result. This does not grant permissions to any Strava source or enable the server's independent-route ranking pipeline.

## Independent terrain decision — 11 September 2026

Owner requested implementation of terrain-aware estimates. Allowed: separate opt-in sharing of sampled owner-drawn segment coordinates to the fixed Open-Meteo elevation endpoint, local deterministic modelling and browser-local storage. No route names, targets, power values, credentials or Strava geometry are sent. This widens coordinate disclosure beyond the start-point weather request only when the user checks the terrain disclosure and presses Load terrain. No automatic elevation request, paid service, account or external deployment is enabled.

Reviewed [elevation API](https://open-meteo.com/en/docs/elevation-api), [terms](https://open-meteo.com/en/terms) and the [Copernicus source description](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM). The free service is for non-commercial use under published rate limits; attribution and CC BY 4.0 are displayed. Provider logs can contain coordinates and remain for 90 days. Profiles remain locally until removed or invalidated. No terrain data enters MCP/AI output, server persistence or logs. Browser testing uses original synthetic elevation responses, not actual personal coordinates. Reassess service terms before commercial release.

## Recorded efforts, GPX import and past wind — 13 September 2026

Owner requested own-effort times on drawn segments and past wind for them. Allowed: reading a GPX file the rider confirms is their own device recording, entirely in the browser, matched against an owner-drawn segment and stored in local storage; a separate opt-in sharing of the segment start coordinate and effort dates with the Open-Meteo historical archive, which the [Open-Meteo terms](https://open-meteo.com/en/terms) cover for free non-commercial use without a key. No route names, file contents, times or credentials are sent; no automatic request is made; no server, account or Strava path is enabled. A file exported from Strava is not treated as automatically independent: the confirmation puts that judgement with the rider, and the Strava rows in the matrix above are unchanged.

## Owner-drawn route and effort disclosure — 22 September 2026

Owner requested that the local MCP server see the segments drawn in the planner, so a conversational host can rank them and read the owner's own matched efforts. Allowed: disclosure of owner-drawn route names, geometry, saved terrain and rider settings, matched efforts (dates, elapsed times, track fit) and any past wind already saved on them, to the local stdio MCP server on the owner's machine and through it to the owner's AI host, under a new policy identity `owner-routes-v1` with analysis, derived outputs and AI disclosure permitted. The data crosses the browser boundary only by an explicit owner action: an export of the route library to a local file that the MCP server reads, or an equivalent loopback hand-off the owner triggers. No automatic sync, no server database, no remote transport, no account and no external service receives it; Open-Meteo requests remain governed by the 9, 11 and 13 September decisions and are not widened.

This is mode 2 independent data: routes were drawn by the owner with the independent-source confirmation, and efforts came from files the rider confirmed as their own device recordings. It does not touch the Strava rows above. No Strava segment identifier, name, geometry or effort is disclosed, and a Strava-exported GPX remains the rider's judgement at import time. Route names and effort labels are untrusted data in MCP output, never instructions. History disclosed this way is the owner's recorded times on their own lines, not verified lifetime records, and the existing "no PR probability" rule stands. Implementation is a separate slice; this entry records the permission, not the code.

## MCP removed — 22 September 2026

Later the same day the owner decided to keep SprintScout as a focused web app and removed the local stdio MCP server, the embedded MCP App and the repository skill. The entry above therefore has no consumer: no MCP or AI surface exists to disclose owner-drawn routes or efforts to, and none is planned. The permission is recorded as history and does not need to be revoked, because nothing implements it. All other rows are unchanged; the planner's browser-local processing and the Open-Meteo decisions stand as written.
