# Plan: pull request review and fix loop

From `spec.md`.

## Files

- `.github/workflows/review.yml`: new. Jobs `review` (paid, gated), `skipped` (writes why), `fix` (tag mode on `@claude`).
- `packages/testing/src/review.ts`: `Findings`, `ReviewTally`, `ReviewRecord`, `parseFindings`, `tallyMarkdown`, `reviewSummary`.
- `packages/testing/src/review.cli.ts`: `pnpm review:tally` turns the action's structured output plus metadata into `tally.json` and `summary.md`.
- `packages/testing/src/review.test.ts`: new.
- `packages/testing/src/dashboard.ts`: `review` field widened, `Inputs.reviews`, snapshot wiring, the two AI cards.
- `packages/testing/src/dashboard.cli.ts`: `--reviews`.
- `packages/testing/src/dashboard.test.ts`: review cards.
- `packages/testing/src/harness.test.ts`: workflow policy checks.
- `scripts/collect-reviews.mjs`: artifact and GraphQL collector for the dashboard job.
- `package.json`: `review:tally` script; `--reviews` on `dashboard`.
- `.github/workflows/ci.yml`: dashboard job runs the collector.
- `REVIEW.md`, `docs/sdlc.md`, `docs/design.md`, `.cspell/project-words.txt`.

## Order

1. `review.ts` with tests, then the CLI.
2. Dashboard field, cards, CLI flag and tests.
3. Collector script.
4. Workflow, Checks job, package scripts.
5. Docs, intent status, verifier.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/review.test.ts packages/testing/src/dashboard.test.ts packages/testing/src/harness.test.ts` green.
- `pnpm review:tally` on a sample structured output writes a valid tally and summary; an invalid one exits non-zero.
- `pnpm dashboard` with a sample `reviews.json` renders the two cards with values.
- `node scripts/collect-reviews.mjs` with no repository access writes `[]` and exits 0.
- `actionlint` (if present) or a YAML parse of `review.yml`.
- `pnpm verify` green.
