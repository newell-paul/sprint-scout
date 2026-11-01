# Plan: remove terrain and Open-Meteo elevation

## Files

- `packages/analysis/src`:
  - delete `terrain-effect.ts` and its test;
  - drop the export from `index.ts`;
  - drop the terrain cases from `boundaries.test.ts` and `ride-effect.property.test.ts`.
- `packages/application`:
  - delete `src/terrain.ts` and its test;
  - drop the `./terrain` export from `package.json`;
  - `route-wind.ts` and its tests lose the terrain input;
  - drop the terrain cases from `shelter.test.ts`.
- `packages/contracts`: drop the elevation response schema.
- `packages/testing`:
  - delete the elevation fixture and handler;
  - drop elevation from faults, call counts and drift;
  - delete the `v1-terrain-mismatch` storage fixture.
- `apps/web/app`:
  - delete `terrain-panel.tsx`, its test and its baselines;
  - `library.ts`: drop the fields and strip legacy ones;
  - `route-effect.ts`, `wind-preview.tsx`, `route-drawer.tsx`, `ride-cockpit.tsx`, `opportunities.ts`, `opportunity-board.tsx`, `example-segment.ts`, `clear-data.tsx`;
  - remove the terrain-only rules from `globals.css`.
  - Tests and fixtures follow.
- `e2e`:
  - delete `terrain.spec.ts` and `pages/terrain.ts`;
  - update `privacy`, `keyboard`, `efforts`, `fixtures` and `pages/planner`;
  - regenerate the baselines.
- Docs: `AGENTS.md`, `README.md`, the `docs/design.md` entry, and current-state docs.

## Order

1. Packages: analysis, application, contracts, testing. Unit tests and typecheck green.
2. Web app and its component tests. Regenerate the component baselines.
3. e2e. Regenerate the e2e baselines.
4. Docs. Run `pnpm verify` through the verifier.

## Proof

- A library holding terrain fields loads, and they're dropped (unit test).
- No elevation request (privacy e2e).
- Flat-road golden fixtures unchanged.
- `pnpm verify` green.
