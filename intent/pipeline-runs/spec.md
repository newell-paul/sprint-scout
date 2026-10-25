# Recent runs strip: spec

## Behaviour

- **Third pipeline card, "Last N runs":**
  - On screens at least 560 px wide, it spans two grid columns.
  - It shows an SVG bar chart with one bar per completed run, oldest first. Bar height is the run's duration (created to updated), scaled to the longest run with at least a minute at the top. The longest duration labels the top, and "N runs ago" and "latest" label the ends. The newest bar glows.
  - Bar colours by result: `pass` (first attempt success) teal, `rerun` (success on attempt 2 or later) orange, `fail` (any other conclusion) red, `cancelled` grey.
  - A legend lists only the results present, with counts.
  - The note says the newest is on the right and what cancelled means.
  - Each bar's `<title>` is its start time in UTC, its result and its duration.
- **No run data:** the card reads "n/a" with "No run data from GitHub".
- **Phone:** the chart scales to the card's width.

## Data and privacy

Unchanged: the run list comes from the GitHub API in the dashboard job, with the job token.

## Calculations

- `pipelineSummary` drops runs whose conclusion is empty (gh's value for a run in progress) as well as null.
- `recent` holds the completed runs in the window, oldest first, each with its duration.
- Cancelled runs stay in `recent` but are left out of `firstPassRate` and of the latest run behind `durationMs`. The rate is null when every run in the window was cancelled.

## Tests

`dashboard.test.ts`:

- the in-progress run is left out (written first; it failed with 240000 ms and 25 %);
- `recent` order and results;
- cancelled kept apart from a failure, and left out of the rate and the latest duration;
- history keeps `recent` on the newest entry only;
- the chart's order, bar heights by duration, the lit newest bar, label, tooltip and empty state.

## Docs

- A `docs/lessons.md` entry for the in-progress run.
- A `docs/design.md` entry.
