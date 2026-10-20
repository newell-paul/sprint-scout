# Plan: end-to-end suite on a production build, with page objects

From [spec.md](spec.md).

## Files

- `playwright.config.ts`: `webServer.command` is `pnpm --filter @scout/web start` when `CI` is set, `pnpm --filter @scout/web dev` otherwise.
- `.github/workflows/ci.yml`: the e2e job runs `pnpm --filter @scout/web build` before `playwright test`.
- `e2e/pages/planner.ts`: `PlannerPage` with `open()`, `reload()`, `status`, `pageWidthFits()` and the panels below.
- `e2e/pages/library.ts`, `editor.ts`, `timeline.ts`, `cockpit.ts`, `map.ts`, `attempt.ts`, `rider.ts`, `shelter.ts`, `terrain.ts`, `efforts.ts`, `board.ts`: one class per panel, locators as readonly fields, user actions as methods. Actions may wait for the app to settle; checks stay in specs.
- `e2e/pages/demo.ts`: `DemoPage` for `/demo`.
- `e2e/pages/index.ts`: re-exports.
- `e2e/fixtures.ts`: adds the `planner` and `demo` fixtures; `drawSegment`, `manage`, `slider`, `segmentHeading`, `segmentTime`, `terrainPanel`, `loadTerrain` and `reverseAndSave` move into page objects and are removed; `paintedPixels` moves into `map.ts`.
- `e2e/*.spec.ts` (16 files): rewritten onto page objects in arrange-act-assert form; independent behaviours split.
- `docs/test-strategy.md`, `docs/design.md`: as the spec says.
- `intent/e2e-production-build/intent.md`: status `in build`, then `done`.

## Order

1. Server switch: config and CI step. Check the static smoke config is unaffected.
2. Page objects and fixtures, with the old helpers still exported so specs keep compiling.
3. Specs one file at a time, each run green on chromium-desktop (and its tagged projects) before the next.
4. Remove the old helpers, lint, knip.
5. Docs, intent status.

## Proof

- Each converted spec: `pnpm exec playwright test e2e/<name>.spec.ts` green on all projects that select it.
- Whole suite locally: `pnpm exec playwright test --repeat-each 3 --workers 8` green.
- Whole suite against the production server locally: `pnpm --filter @scout/web build`, then `CI=1 pnpm exec playwright test` with retries off green.
- `pnpm test:smoke:static` after `pnpm --filter @scout/web build:static`: green.
- `pnpm verify`: green.
- CI on the pull request: four e2e shards green; slowest test and median compared with the 20 October `main` run (22.9 s, 10.5 s).
