# Spaced arrows on the segment line: plan

## Files

- `apps/web/app/routes/route-features.ts` (new): `routeFeatures(points, saved)` builds the route source's line and dots.
- `apps/web/app/routes/route-features.test.ts` (new): drawing and saved cases.
- `apps/web/app/routes/route-drawer.tsx`: the arrow layer uses line placement with an 80 px spacing and turns the north-pointing chevron by 90° to follow the line; the dots layer drops the arrow filter; the route effect uses `routeFeatures`; `bearingDegrees` is removed.
- `docs/design.md`, `intent/spaced-arrows/*`.

## Order

1. `routeFeatures` and its test; `pnpm test` green.
2. Drawer wiring.
3. Manual look on the dev server at both segments, desktop and phone width.
4. Docs; verifier runs `pnpm verify`.

## Proof

- `pnpm test`: the new unit test passes.
- Screenshots of Bridge to bridge up and Richmond Park on the dev server.
- `pnpm verify`: green.
