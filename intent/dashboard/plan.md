# Plan: engineering dashboard

## Files

- `packages/testing/src/dashboard.ts` (renamed from `test-health.ts`): wider `Snapshot`, readers for the new inputs, calculations, render, badges.
- `packages/testing/src/dashboard.cli.ts`: new options for every input, writes `index.html`, `history.json`, `badges/*.json`.
- `packages/testing/src/dashboard.test.ts`: extended.
- `.github/workflows/ci.yml`: static job writes type coverage JSON; unit report and component jobs write Vitest JSON; deploy gate uploads Lighthouse and size JSON; health job becomes the dashboard job and also fetches the evals artifact and GitHub stats.
- `.github/workflows/pages.yml`: publishes the `dashboard` artifact at `/dashboard/`.
- `apps/web/public/test-health/index.html`: redirect.
- `package.json`: `dashboard` script replaces `test:health`.
- `README.md`, `docs/test-strategy.md`, `docs/sdlc.md`, `docs/design.md`, `.cspell/project-words.txt`.

## Order

1. Module and tests, green locally with the fixtures and the local Lighthouse and size output.
2. CLI, run locally against whatever reports exist.
3. Workflows, YAML validated.
4. Redirect, README, docs.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/dashboard.test.ts` green.
- `pnpm dashboard` renders `reports/dashboard/index.html` locally; opened in the browser in light and dark.
- `pnpm verify` green.
