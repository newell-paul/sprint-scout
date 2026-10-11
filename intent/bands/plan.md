# Plan: bands

## Files

- `packages/testing/bands.yaml`: eleven bands.
- `packages/testing/src/bands.ts` and `bands.test.ts`.
- `packages/testing/src/dashboard.ts`: `render(history, annotations)` with the bands panel; `dashboard.cli.ts`: `--bands`, outputs and exit code.
- `package.json`: `yaml` dev dependency, `--bands` in the `dashboard` script.
- `.github/workflows/ci.yml`: dashboard job fails after upload on a 3σ breach.
- `docs/sdlc.md`.

## Order

Module and tests, then CLI and render, then workflow and docs.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/bands.test.ts packages/testing/src/dashboard.test.ts` green.
- `pnpm dashboard` locally writes `bands.md` with every band inert on a one-run history.
- `pnpm verify` green.
