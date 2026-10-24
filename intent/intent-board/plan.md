# Plan: Intent board on the dashboard

From [spec.md](spec.md).

## Files

- `packages/testing/src/dashboard.ts`:
  - `IntentFile` gains optional `spec` and `plan` flags;
  - new types `OpenIntent` and `BoardCard`;
  - new pure functions `checkState(rollup)` and `intentBoard(main, open, repo)`;
  - `Inputs` gains `openIntents` and `repo`; `Snapshot` gains `board`;
  - `appendHistory` keeps `board` on the newest entry only;
  - `render` adds the Intent board section and drops the intents table.
- `packages/testing/src/dashboard.cli.ts`: `readIntents` adds spec and plan presence; `--open-intents` and `--repo` options.
- `packages/testing/src/dashboard.test.ts`: the cases in the spec. The page-wide no-URL assertion now allows GitHub anchor links, the board's only URLs; the page still loads nothing external.
- `scripts/collect-intents.mjs`: new; writes `reports/github/open-intents.json`, `[]` on any failure.
- `package.json`: the `dashboard` script passes `--open-intents reports/github/open-intents.json`.
- `.github/workflows/ci.yml`: a dashboard job step "Collect intents on open pull requests" after the review tallies, `GH_TOKEN: ${{ github.token }}`, `|| true`; the job gains `checks: read` and `statuses: read` for the check rollup. The band-issue job strips the board and keeps only `bands.json` and `history.json` before its model runs.
- `docs/design.md`, `docs/sdlc.md`: as in the spec.
- `intent/intent-board/intent.md`: status `done` at the end.

## Order

1. Tests for `checkState`, then the function.
2. Tests for `intentBoard` (columns, merge, title, date, sort), then the function.
3. Snapshot and history tests, then `snapshot` and `appendHistory`.
4. Render tests, then the board section and its CSS.
5. CLI options and `readIntents` presence flags.
6. Collector script, `package.json` and the CI step. Run the collector locally against the repo to see a real file.
7. Build the dashboard locally from that file and look at the board in light and dark.
8. Docs; intent status `done`.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/dashboard.test.ts`: the new cases pass; each new case fails against the code before its step.
- `node scripts/collect-intents.mjs` then `pnpm dashboard`: `reports/dashboard/index.html` shows this branch's pull request as an In build card once it is open.
- `pnpm verify` green through the verifier agent.
