# Plan: Manual rebuild of the intent board

From [spec.md](spec.md).

## Files

- `packages/testing/src/dashboard.ts`: `Snapshot` gains `boardAt` and `repo`; `snapshot` fills them when it builds a board; new `refreshBoard`; the board section opens with the "Built on … Rebuild now" line.
- `packages/testing/src/dashboard.cli.ts`: `--refresh-board <dir>` reads `history.json` and `bands.json` from the dashboard directory, refreshes the board and rewrites `history.json` and `index.html` only.
- `packages/testing/src/dashboard.test.ts`: the cases in the spec.
- `.github/workflows/pages.yml`: on `workflow_dispatch`, after the dashboard download, run the collector and the refresh; the three read permissions.
- `docs/design.md`, `docs/sdlc.md`; `intent/board-rebuild/intent.md` status `done` at the end.

## Order

1. `refreshBoard` test, then the function.
2. Render test for the line and link, then the render change.
3. CLI mode; run it locally against a built dashboard directory.
4. Pages workflow step and permissions.
5. Docs; intent `done`.

## Proof

- `pnpm exec vitest run --project unit packages/testing/src/dashboard.test.ts`: the new cases pass and fail before their step.
- Local: build a dashboard, run `--refresh-board` on it, see the new date on the board and the rest of `index.html` unchanged apart from the board section.
- After merge: a manual Pages run publishes a board whose "Built on" date is the run date.
- Unit and component suites green; typecheck, lint, markdown and spelling clean.
