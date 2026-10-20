# Spec: end-to-end suite on a production build, with page objects

From [intent.md](intent.md), accepted 20 October 2026.

## Behaviour

No product behaviour changes. What changes is how the suite runs and reads.

- **Server.** In CI (`CI` set) Playwright's `webServer` runs `pnpm --filter @scout/web start` against a `next build` made by a separate step in the e2e job. Locally it keeps `next dev` and reuses a running dev server. `next start` serves the same routes as the dev server, including `/demo`, `/health` and `/api/planner`, so every spec runs unchanged against it. Measured locally on 20 October 2026: all 129 local tests pass against `next start`, chromium-desktop median 1.1 s and slowest 2.0 s, against 2.5 s and 5.4 s on `next dev` with the same 4 workers.
- **Page objects.** `e2e/pages/` holds one class per screen and one per panel. Each owns its locators and the user actions on them, named for what the rider does (`drawSegment`, `rankSegments`, `loadTerrain`), never for the markup. Specs reach the page only through these objects plus `expect`; no spec builds a locator. Two fixtures expose them: `planner` (the planner at `/`) and `demo` (the demo at `/demo`). Panels hang off the planner: `library`, `editor`, `timeline`, `cockpit`, `map`, `attempt`, `rider`, `shelter`, `terrain`, `efforts`, `board`.
- **Arrange, act, assert.** Every test has three blocks separated by one blank line, with no phase comments. Arrange is seeding, stubbing and navigation; act is the user action under test; assert is the checks. A test that needs a reload to prove persistence reloads in act. A journey whose later steps depend on earlier ones (undo after adding a point, retry after a failure) may repeat act and assert once more; no test goes beyond two act blocks.
- **Atomic.** One behaviour per test. Tests that today check two independent behaviours are split: for example "the map overlay shows the wind and particles can be switched off" becomes one test for the overlay and one for the switch. Every test arranges its own state through `seed`, `openMeteo` and the clock fixtures, shares nothing through module variables, and passes in any order.
- **Parallel.** `fullyParallel` stays on. Proof is a run with `--repeat-each 3` on 8 workers locally and the normal four shards in CI.
- **Coverage.** Every assertion made today is still made somewhere. Tags (`@smoke`, `@a11y`, `@keyboard`, `@mobile`, `@mobile-only`, `@visual`) stay on the same behaviours so the project filters, the static smoke gate and WebKit runs keep their scope. ARIA snapshot names and screenshot names do not change.

## Data and privacy

Unchanged. The Open-Meteo stub stays automatic, `externalRequests` and the privacy specs keep asserting that nothing leaves the browser before consent and only allowed hosts are contacted.

## Calculations

None.

## Tests

- All 16 specs rewritten onto page objects; the count rises from 119 where tests are split.
- No ARIA snapshot or screenshot baseline changes; if one differs, the refactor changed behaviour and is wrong.
- The static smoke gate (`playwright.static.config.ts`) uses the same specs and fixtures and must stay green.
- ESLint's Playwright rules apply to `e2e/pages/` as well as specs.

## Docs

- `docs/test-strategy.md` L5: page objects, arrange-act-assert and the production server in CI.
- `docs/design.md`: dated entry "E2E on a production build" with the measured timings before and after.
