# Plan: saved data

## Files

- `apps/web/app/routes/library.ts`: zoned-instant check and normalisation for effort times; wind direction rule.
- `packages/analysis/src/effort-match.ts`: 0.1 s floor.
- `apps/web/app/routes/rider-settings.tsx`, `wind-preview.tsx`, `route-drawer.tsx`: `onRiderChange` returns a boolean; the note reports a refused store.
- `packages/application/src/gpx.ts`, `apps/web/app/routes/efforts-panel.tsx`: skipped and zone-less counts in the import message.
- `packages/analysis/src/ride-effect.ts`, `packages/application/src/route-wind.ts`, `apps/web/app/components/weather-icon.tsx`, `apps/web/app/routes/wind-preview.tsx`: comments.
- Tests named in the spec; `docs/design.md`.

## Order

1. Failing tests for B1, B2, B3, B4, B5.
2. Fixes, with the test lock on.
3. Comments, design entry, status `done`.

## Proof

The new tests fail before the fixes and pass after; `pnpm verify` green.
