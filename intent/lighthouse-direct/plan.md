# Plan: Lighthouse without Lighthouse CI

From [spec.md](spec.md).

## Files

- `packages/testing/src/lighthouse-gate.ts` and `.test.ts`: the pure gate, representative choice and manifest.
- `packages/testing/src/lighthouse.cli.ts`: server, Chrome, three runs, files, exit code.
- `packages/testing/package.json`: `lighthouse` 13 and `chrome-launcher` as dev dependencies.
- `package.json`: drop `@lhci/cli`; `test:lighthouse` runs the CLI.
- `lighthouse.json`: new; `lighthouserc.json`, `budgets.json`: deleted.
- `osv-scanner.toml`, `.cspell/project-words.txt`: drop what only Lighthouse CI needed.
- `pnpm-lock.yaml`.
- `docs/design.md`, `docs/test-strategy.md`; intent status `done` at the end.

## Order

1. Gate tests, then the gate.
2. Dependencies and the CLI; run it locally against `pnpm build:static`.
3. Remove Lighthouse CI, its config and ignores; confirm `pnpm why extract-zip` is empty and OSV has no new findings.
4. Docs.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/lighthouse-gate.test.ts` passes; each case fails against a stub gate.
- `pnpm check:deploy` passes locally on Lighthouse 13 and writes `.lighthouseci/manifest.json`; `pnpm dashboard` reads it.
- `pnpm why extract-zip` reports nothing.
- `pnpm verify` through the verifier agent, and CI's budgets job green.
