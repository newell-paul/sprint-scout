# First click only wakes the map: plan

## Files

- `packages/ui/src/maplibre.ts`, `maplibre.test.ts`: restore `takeActivation()` and its two tests.
- `apps/web/app/routes/route-drawer.tsx`: the map click handler returns early on `activation.takeActivation()`.
- `e2e/drawing.spec.ts`: the first test expects no point after the waking click and the start after the next; the mouse-leave test clicks twice.
- `docs/design.md`, `intent/first-click-wakes/*`.

## Order

1. Tests first: unit and e2e changed and shown failing.
2. The helper and the drawer.
3. Docs; the verifier runs `pnpm verify`.

## Proof

- The new unit tests and the changed e2e test fail before the fix and pass after.
- `pnpm verify`: green.
- Manual check on the dev server, desktop and phone.
