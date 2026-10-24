# Spec: Lighthouse without Lighthouse CI

From [intent.md](intent.md).

## Behaviour

`pnpm test:lighthouse` runs `packages/testing/src/lighthouse.cli.ts`:

1. Serves `apps/web/out` with `scripts/serve-static.mjs` under the `/sprint-scout` base path, waiting for its ready line, as Lighthouse CI did.
2. Launches Chrome with `chrome-launcher` (`--headless --no-sandbox --disable-gpu`) and runs Lighthouse 13 three times on `http://127.0.0.1:4173/sprint-scout/` with the desktop preset.
3. Writes each run to `.lighthouseci/` as `<n>.report.json` and `<n>.report.html`, and `manifest.json` with one entry per run: `url`, `isRepresentativeRun`, `jsonPath`, `htmlPath` and `summary` (category scores), the shape the dashboard already reads.
4. Applies the gate from `lighthouse.json` and exits 1 with one line per failure, or prints the pass.

**The gate** (`packages/testing/src/lighthouse-gate.ts`, pure):

- Category scores: performance, accessibility and best practices at least 0.9.
- Timings: largest contentful paint at most 2500 ms, total blocking time at most 300 ms.
- Scores and timings use the best of the three runs, Lighthouse CI's default "optimistic" rule, so one noisy run does not fail the gate.
- Resource budget, restored: on the representative run, script transfer size at most 650 KiB and total at most 900 KiB, summed from the `network-requests` audit.
- The representative run is the one with the median performance score; ties go to the earlier run.
- A missing category or audit fails the gate with "not reported", so a renamed audit cannot pass silently again.

`lighthouse.json` replaces `lighthouserc.json` and `budgets.json` and holds the URL, run count and every threshold.

## Data and privacy

No change. Lighthouse loads only the local static export; nothing else is contacted.

## Calculations

Median and best-of selection over three runs; byte sums over the representative run's requests. Deterministic for given reports.

## Tests

Unit, `packages/testing/src/lighthouse-gate.test.ts`:

- passes when every threshold is met;
- best-of: one failing run among passing ones still passes;
- each threshold fails with its own message when every run misses it;
- resource budget: script and total sums, failing over the limit;
- missing category or audit fails as "not reported";
- representative: median performance, earlier run on a tie;
- manifest entries carry the summary and representative flag.

The CLI is proved by running `pnpm check:deploy` locally and in CI.

## Docs

- `docs/design.md`: dated entry "Lighthouse without Lighthouse CI — 24 October 2026", including the unenforced budget.
- `docs/test-strategy.md`: the Lighthouse gate's tool and rules.
