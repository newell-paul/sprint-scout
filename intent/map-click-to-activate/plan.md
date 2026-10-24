# Plan: map takes control only after a click

## Files

- `packages/ui/src/maplibre.ts`: `clickToActivate(map, element)` returns a cleanup function.
- `packages/ui/src/maplibre.test.ts`: unit tests for the helper with a fake map and event targets.
- `packages/ui/src/route-map.tsx`: call the helper after creating the map; clean up on dispose.
- `apps/web/app/routes/route-drawer.tsx`: same.
- The hint is styled inline by the helper, because the drawing map does not import `map.css`; `map.css` is unchanged.
- `e2e/pages/demo.ts`, `e2e/demo.spec.ts`: activation and page-scroll tests.
- `docs/design.md`: dated entry.
- `AGENTS.md`: known mistake for the `next dev` reload loop, which recurred during this work.

## Order

1. Helper and unit tests.
2. Wire both maps and the CSS.
3. E2E tests.
4. Docs, intent status done.

## Proof

`pnpm test` (helper tests), `pnpm exec playwright test e2e/demo.spec.ts e2e/drawing.spec.ts --project chromium-desktop --project chromium-mobile`, then `pnpm verify`.
