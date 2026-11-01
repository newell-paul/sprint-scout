# Segment from GPX: plan

## Files

- `packages/analysis/src/track-stretch.ts` (new): `nearestTrackIndex`, `trackStretch`.
- `packages/analysis/src/track-stretch.test.ts`, `track-stretch.property.test.ts` (new): unit and property tests.
- `packages/analysis/package.json`: export `./track-stretch`.
- `apps/web/app/routes/route-drawer.tsx`: ride state and the queue of pre-cut files, "From GPX" (multiple) and "Use whole track", ride overlay layer, one point-adding path shared by taps and typed coordinates, Save opening the next queued file, Undo, Cancel and Escape handling.
- `apps/web/app/globals.css`: the file control in the drawing bar.
- `e2e/pages/editor.ts`: `importRide`, the control and whole-track locators.
- `e2e/data/make-gpx.ts`: a run-up parameter and two pre-cut fixtures; existing fixtures regenerate unchanged.
- `e2e/segment-from-gpx.spec.ts` (new).
- `docs/design.md`, `docs/integration-decisions.md`, `README.md`.
- `intent/segment-from-gpx/intent.md`, `spec.md`, `plan.md`: status, and the widened scope (several files, Use whole track).

## Order

1. Write the analysis module and its tests; `pnpm test` green with 100 % coverage on the module.
2. Change the route drawer and CSS.
3. Add the page object and the e2e spec; run them on the three projects.
4. Update the docs and set the intent to done.
5. `pnpm verify`; verifier agent.

## Proof

- `pnpm test`: the new unit and property tests pass, and analysis keeps 100 % coverage.
- `pnpm exec playwright test e2e/segment-from-gpx.spec.ts e2e/drawing.spec.ts e2e/privacy.spec.ts`: green on all projects.
- `pnpm verify`: green.
- Manual check on the dev server: cut a segment from one of the owner's own rides on desktop and phone.
