# Elevation profile from GPX heights: plan

## Files

- `packages/application/src/gpx.ts`, `gpx.test.ts`: `ele` on each point.
- `packages/analysis/src/track-stretch.ts`, its tests and property test: return `indices`.
- `packages/analysis/src/elevation.ts`, `elevation.test.ts` (new): `elevationProfile`.
- `packages/analysis/package.json`: export `./elevation`.
- `apps/web/app/routes/library.ts`, `library.test.ts`: `heightsM`, kept when valid and dropped otherwise.
- `apps/web/app/routes/route-drawer.tsx`:
  - `RideFile` carries heights.
  - The cut, Use whole track and queued files set a draft `cut` (points and heights).
  - Redraw sets it from the saved segment.
  - Save writes `heightsM` only when the points equal the cut points.
- `apps/web/app/routes/elevation-section.tsx` (new), `elevation-section.browser.test.tsx` (new), with its ARIA baselines.
- `apps/web/app/routes/wind-preview.tsx`: render the section after Target when the route has heights. `wind-preview.browser.test.tsx` checks it shows only with heights.
- `apps/web/app/globals.css`: section styles.
- `e2e/data/make-gpx.ts` and the regenerated fixtures, `e2e/segment-from-gpx.spec.ts`, `e2e/pages/` (an elevation locator), `e2e/fixtures.ts` (`heightsM` on a seeded route, for the rename test).
- `docs/design.md`, `docs/integration-decisions.md`, `README.md`, `intent/gpx-heights/*`.

## Order

1. The reader, stretch and elevation module with tests; `pnpm test` green, analysis at 100 %.
2. Library storage and tests.
3. Drawer wiring, the section and the wind preview; component tests and new baselines through the test runner.
4. Fixtures and e2e on three projects.
5. Docs; intent to done; the verifier runs `pnpm verify`.

## Proof

- `pnpm test`: the new and changed unit tests pass with 100 % analysis coverage.
- `pnpm test:component`: the section's three states pass, and the wind-preview baselines are unchanged.
- `pnpm exec playwright test e2e/segment-from-gpx.spec.ts`: green on all projects.
- `pnpm verify`: green.
- Manual check on the dev server: cut Bridge to bridge up from `~/Downloads/bridge-to-bridge-up.gpx` and see "Start 14.4 m · Finish 12.4 m · Falls 2.0 m".
