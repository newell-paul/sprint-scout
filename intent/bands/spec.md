# Spec: bands

## Behaviour

- `bands.yaml` lists metrics: a dotted path into the dashboard snapshot, the worse direction, a unit, an optional window (default 20 previous runs), minimum runs (default 5) and minimum sigma.
- For each band the latest value is compared with the mean and sample standard deviation of the previous values in the window. The distance in the worse direction, divided by the larger of the standard deviation and the minimum sigma, is the level: below 1 nothing, 1 logged, 2 annotated, 3 failing.
- The CLI writes `bands.json` and `bands.md`, prints every level 1 or above, and exits 3 after writing everything when any band is at level 3.
- The dashboard shows a panel under the navigation: one quiet line when everything is within band, an amber panel listing 2σ breaches, a red panel for 3σ.
- The dashboard job marks the build step `continue-on-error`, appends `bands.md` to the job summary, uploads the artifact, then fails when the build step failed.

## Data and privacy

Only the dashboard history. Nothing new leaves the job.

## Calculations

Sample standard deviation (n − 1). Improvements never raise a level. All in `packages/testing/src/bands.ts` with fixed-input tests.

## Tests

`packages/testing/src/bands.test.ts`: path reading including the derived eval rate, statistics, each level, direction, minimum sigma, window, inert bands, Markdown summary. `dashboard.test.ts` covers the panel.

## Docs

`docs/sdlc.md` progress; the YAML file documents itself.
