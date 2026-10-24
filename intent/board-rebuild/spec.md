# Spec: Manual rebuild of the intent board

From [intent.md](intent.md).

## Behaviour

- **The control.** The board section opens with a line "Built on <date>. Rebuild now", where "Rebuild now" links to the Pages workflow in GitHub Actions (`actions/workflows/pages.yml`). There the owner presses **Run workflow** on `main`.
- **A manual run** of "Publish segment planner to GitHub Pages":
  1. builds and gates the app as today (smoke journeys, size, Lighthouse);
  2. downloads the dashboard artifact of the latest successful `main` Checks run, as today;
  3. collects intents on open pull requests with `scripts/collect-intents.mjs`;
  4. rebuilds the board from the checked-out `main` intents and those pull requests, puts it on the newest history entry, and rewrites `index.html` and `history.json` with the artifact's existing bands;
  5. publishes.
- **The date.** The board's "Built on" date is the date of the rebuild, so a refreshed board says it is newer than the rest of the page. The rest of the page is unchanged.
- **A run after Checks** (the `workflow_run` trigger) does not refresh: the Checks run's dashboard is already current.
- **Failure.** If the collector cannot read pull requests it writes `[]`, and the board shows `main` only. If the artifact is missing, there is nothing to refresh and the step does nothing, as today.

## Data and privacy

No change for the planner. The Pages workflow gains `pull-requests: read`, `checks: read` and `statuses: read`, the same read-only scopes the dashboard job has. No new secret or schedule.

## Calculations

None. `intentBoard` is reused unchanged. A new pure `refreshBoard(history, board, date)` returns the history with the newest entry's board and board date replaced; an empty history stays empty.

## Tests

Unit, in `packages/testing/src/dashboard.test.ts`:

- `refreshBoard` replaces only the newest entry's board and date, leaves older entries and every other field alone, and returns an empty history unchanged;
- the board renders "Built on" with the board date, falling back to the snapshot date, and a "Rebuild now" link to `https://github.com/<repo>/actions/workflows/pages.yml`.

No component, e2e or ARIA snapshot changes.

## Docs

- `docs/design.md`: dated entry "Manual rebuild of the intent board — 24 October 2026".
- `docs/sdlc.md`: the dashboard section says how to refresh the board.
