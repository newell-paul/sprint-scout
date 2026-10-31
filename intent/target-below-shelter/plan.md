# Plan: target below shelter

## Files

- `apps/web/app/routes/wind-preview.tsx`: render `TargetSettings` after `ShelterSettings`.
- `apps/web/app/routes/target-settings.tsx`: placeholder `1:00`.
- `apps/web/app/routes/__aria__/`: baselines regenerated with `vitest -u`.
- `docs/design.md`.

## Order

1. Move and placeholder.
2. Regenerate the component ARIA baselines.
3. Design entry; `pnpm verify`.

## Proof

- `pnpm test:component` and the target e2e tests pass.
- `pnpm verify` green.
