# Plan: segment from a ride

## Files

- `packages/analysis/src/track.ts` and `track.test.ts`, `track.property.test.ts`; `packages/analysis/package.json` export `./track`.
- `apps/web/app/routes/ride-source.tsx` and `ride-source.browser.test.tsx`: section, tick, file input, sliders, Close.
- `apps/web/app/routes/route-drawer.tsx`: ride state, ride layer, the click handler picks while a ride is open, bar texts, points from the cut, closing on save, cancel and tab switch, footer privacy sentence.
- `apps/web/app/globals.css`: section and slider layout.
- `e2e/pages/ride.ts`, `e2e/pages/index.ts`, `e2e/fixtures.ts` if needed, and `e2e/ride.spec.ts`; ARIA baseline from the runner.
- `docs/design.md`, `README.md`.

## Order

1. Analysis functions, tests first.
2. RideSource component and its tests.
3. Route drawer wiring, CSS, footer.
4. E2E and its page object.
5. Docs; `pnpm verify`; intent set to done.

## Proof

- `pnpm test`, with `packages/analysis` still at 100 % coverage.
- `pnpm test:component`.
- `pnpm test:e2e` covers the new spec on all three projects, plus the privacy specs.
- `pnpm check:deploy` holds the client JavaScript ceiling.
- `pnpm verify` green.
