# Plan: example segment on first visit

## Files

- `apps/web/app/routes/example-segment.ts`: points, `exampleRoute`, `seedExampleOnFirstVisit`.
- `apps/web/app/routes/example-segment.test.ts`: the three unit tests.
- `apps/web/app/routes/route-drawer.tsx`: call the seeder before the first library read.
- `e2e/fixtures.ts`: `firstVisit` option and the auto `library` fixture that writes `[]`.
- `e2e/drawing.spec.ts`: the first-visit scenario.
- `README.md`, `docs/design.md`.

## Order

1. Module and unit tests.
2. Drawer call.
3. Fixtures, then the scenario.
4. Docs.

## Proof

- `pnpm test` includes `example-segment.test.ts` green.
- `pnpm test:e2e` green on all three projects, including the new scenario.
- Manual: fresh browser profile on the dev server opens on the example with a forecast.

Result 9 October 2026: unit 41 passed in the web routes, e2e 127 passed, manual check done in a clean Playwright session and on the owner's phone.
