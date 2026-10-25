# TypeScript review handoff — 25 October 2026

Reviewer: Codex (`gpt-6-astra`, high reasoning), read-only, scope `apps/web/app` and `packages/{application,analysis,contracts,ui}/src`, production code only. Claude (Opus 5.5) checked every finding against the code at `ff0a52f` and re-ranked them. Codex ran typecheck and lint (both clean); it did not run `pnpm verify`.

## For the implementing agent

- Read `AGENTS.md` first. Work beyond a one-line fix starts from `intent/<slug>/`; bug fixes are test-first (`bugfix` skill): failing test, then fix, then `pnpm verify`.
- One pull request per group below. Merge only when the owner asks and Checks are green.
- Line numbers are as of `ff0a52f`; re-find them before editing.
- Don't refactor beyond each finding. Codex's "Strengths worth keeping" list (end of this document) marks what not to touch.

## Findings

| Rank | ID     | Severity       | Category    | Location                                                                         | One line                                                                                                                             |
| ---- | ------ | -------------- | ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | F4     | Major          | correctness | `packages/application/src/gpx.ts:28`, `packages/analysis/src/effort-match.ts:29` | GPX segments are flattened and the 60 s gap limit is declared but never enforced, so a gap of an hour yields a fictitious effort     |
| 2    | F3     | Major          | correctness | `apps/web/app/routes/efforts-panel.tsx:154`                                      | Past-wind loading writes back a pre-request snapshot of efforts, restoring any removed while it ran                                  |
| 3    | F9     | Major          | performance | `apps/web/app/routes/opportunity-board.tsx:82,105`                               | After one Refresh, any unrelated save refetches every forecast with `force` on                                                       |
| 4    | F10    | Minor          | correctness | `apps/web/app/routes/efforts-panel.tsx:139,178`                                  | The 20 s past-wind timeout aborts silently: no message, nothing saved                                                                |
| 5    | F7     | Minor          | react       | `apps/web/app/routes/route-drawer.tsx:108`, `wind-preview.tsx:244`               | Opening the same opportunity twice does nothing, because the request is keyed only by its timestamp                                  |
| 6    | F6     | Minor          | performance | `apps/web/app/routes/efforts-panel.tsx:83`                                       | `file.text()` reads the whole file before the 25 MB check; the limit counts UTF-16 units but is named `bytes`                        |
| 7    | F5     | Minor          | performance | `packages/application/src/gpx.ts:6`                                              | Unclosed `<trkpt>` tags make the lazy regex rescan to the end: quadratic on malformed input, on the main thread                      |
| 8    | F8     | Minor          | react       | `apps/web/app/routes/target-settings.tsx:13`, `wind-preview.tsx:284`             | The target input's draft never resyncs when the stored target changes in another tab                                                 |
| 9    | F12    | Minor          | types       | `apps/web/app/routes/library.ts:192`                                             | Stored `terrainMode` isn't validated; any value other than `"flat"` becomes `"terrain"`                                              |
| 10   | F13    | Minor          | types       | `apps/web/app/routes/opportunities.ts:9`                                         | `Opportunity` is an optional bag; `status` doesn't narrow the payload                                                                |
| 11   | F11    | Nit            | performance | `apps/web/app/routes/efforts-panel.tsx:202`                                      | Effort rows recompute ride physics on every forecast-slider render (measured in Node only)                                           |
| —    | F1, F2 | Owner decision | privacy     | `route-drawer.tsx:304`, `example-segment.ts:41`, `forecast-cache.ts:41`          | Map tiles and the example's forecast load without a user action, which contradicts the `AGENTS.md` rule but matches `docs/design.md` |

## Details

### F4 — GPX invents efforts across recording gaps (Major)

- **Problem:** `parseGpx` collects every `<trkpt>` into one list, discarding `<trk>` and `<trkseg>` boundaries. `matchEfforts` tracks `gapSeconds` but never rejects on it: `trackLimits.gapSeconds = 60` is declared and unused.
- **Evidence (Codex):** two `<trkseg>`s, longitude −0.001 at 00:00 and 0.002 at 01:00, produced a 1,200 s effort starting at 00:20.
- **Fix:**
  - Return segments from `parseGpx` (`points: TrackPoint[][]`, or a segment index on each point) and match each segment on its own.
  - In `matchEfforts`, break a candidate when a sample gap exceeds `trackLimits.gapSeconds`.
- **Tests:** a unit test in `effort-match.test.ts` (gap over the limit gives no effort) and in `gpx.test.ts` (two segments stay separate). Both must fail first.

### F3 — Async effort updates restore deleted data (Major)

- **Problem:** after `await loadArchiveWind`, the code maps `route.efforts` from the render that started the request. The parent's `persist` checks only geometry, and Remove stays enabled while loading.
- **Reproduce:** press Load past wind, remove an effort before it returns, and the effort comes back.
- **Fix:** let `onEffortsChange` take an updater `(current: RouteEffort[]) => RouteEffort[]`. Apply wind by effort ID to the stored efforts inside `persist`, and apply GPX imports the same way.
- **Tests:** a component or e2e test with a delayed archive response.

### F9 — Unrelated saves force every forecast to reload (Major)

- **Problem:** `targets` is memoised on `routes`, so any save makes a new array and reruns the fetch effect. `force: generation > 0` stays on after the first Refresh, so cached forecasts are bypassed.
- **Reproduce:** rank, press Refresh, save a target time, and every route refetches. This adds load on Open-Meteo's free tier.
- **Fix:**
  - Key the targets on a stable string of `id`, start point and `confirmed`, so content, not identity, triggers the fetch.
  - Make `force` apply only to the fetch that the Refresh press starts, for example through a ref that is cleared once used.
- **Tests:** a component test that counts `openMeteo` calls after a target save.

### F10 — Past-wind timeouts fail silently (Minor)

- **Fix:** `controller.abort(new DOMException("timeout", "TimeoutError"))` in the timer. In the catch, show "Past wind timed out; try again." when `signal.reason?.name === "TimeoutError"`, and stay silent only for an unmount abort.

### F7 — Reopening the same opportunity does nothing (Minor)

- **Fix:** store `{ at, seq }` with an incrementing `seq` in `openOpportunity`, and make the `WindPreview` effect depend on the request object.
- **Test:** open, move the slider, open the same opportunity again, and the slider returns.

### F6 — Size check after full read (Minor)

- **Fix:** check `file.size > gpxLimits.bytes` before `file.text()` with the existing message. Rename the parser's limit to `chars`, or compare `new Blob([text]).size`.

### F5 — Quadratic GPX parsing on malformed input (Minor)

- **Fix:** with F4, replace the regex with `DOMParser` (`application/xml`) in the browser. Alternatively, use a tokenizer that advances monotonically and rejects an unclosed `<trkpt>`.
- **Note:** `packages/application` must stay usable in unit tests, which run in Node. Inject the parser or keep a monotonic scanner.
- **Test:** 200 KB of unclosed `<trkpt>` tags must parse in linear time, or be rejected.

### F8 — Stale target draft (Minor)

- **Fix:** add `targetTimeS` to `TargetSettings`' key in `wind-preview.tsx`, which is the smallest change. Or resync in an effect when `target` changes and the input isn't focused.

### F12 — Unvalidated `terrainMode` (Minor)

- **Fix:** in `readLibrary`, reject a defined `terrainMode` that isn't `"flat"` or `"terrain"`, using the existing preservation error, and drop the cast.
- **Test:** add a case to `library.test.ts`.

### F13 — `Opportunity` is not a discriminated union (Minor)

- **Fix:** split it into `{ status: "ranked"; bestAt: string; bestTimeS: number; … } | { status: "loading" } | { status: "unavailable"; reason: string; hours?: … }`. Narrow by `status` in `opportunity-board.tsx` and remove the null checks that become redundant.

### F11 — Effort rows recompute every render (Nit)

- **Fix:** `useMemo` the derived rows on `route.efforts`, `route.points`, terrain, shelter, `rider` and `unit`. Do this only if a browser profile shows a real cost; Codex measured it in Node.

### F1, F2 — Network before user action (owner decision, not a defect)

- `AGENTS.md` says every network request follows a user action or consent. But `docs/design.md` (lines 386 and 571) records two owner decisions: the map loads OpenStreetMap tiles directly, and the example segment's forecast loads on the first visit.
- **Owner to choose one:**
  - (a) Reword the `AGENTS.md` rule to name these two exceptions.
  - (b) Gate both, with a "Load street map" action and an unconfirmed example segment that has its own consent.
- **Do not change behaviour without that decision.**

## Suggested pull requests

1. **GPX robustness:** F4, F5, F6.
2. **Effort writes:** F3, F10.
3. **Board fetching:** F9.
4. **Small React fixes:** F7, F8.
5. **Types:** F12, F13.
6. **F11:** only after profiling.
7. **F1 and F2:** only after the owner decides.

## Strengths worth keeping (Codex)

- Deterministic analysis functions, with explicit model versions and bounded geometry.
- Missing weather stays unavailable rather than becoming fabricated calm conditions.
- The forecast and elevation loaders bound their response streams and omit credentials.
- Storage validation preserves unreadable data instead of overwriting it.
- Map and animation effects clean up explicitly.
