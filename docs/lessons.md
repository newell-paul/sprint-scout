# Lessons

One entry per bug that reached `main` or a shipped build, newest first. Each names the test that now catches it. When a class of mistake appears twice, it also becomes a line under "Known mistakes" in `AGENTS.md`.

## 24 October 2026: demo comparisons timed out on a cold dev server

- What broke: `demo.spec.ts` tests that compare ("a forecast outage offers a retry", "retry after a network failure…", "a partial failure…") failed about 2 runs in 60 locally, waiting more than 5 s for the "Compare windows →" button to come back from "Comparing…". Never seen in CI.
- Found by: local `pnpm verify` runs. The trace shows the `/api/planner` request never answered while 33 echarts chunks were still pending. The dev server splits echarts into dozens of lazy chunks; on a cold server they take seconds and fill Chrome's six connections per host, so the comparison queued behind them. CI serves the production build, which bundles echarts into a few files.
- Fix: the hour chart exposes `data-chart-ready`, like the map's `data-map-ready`. `DemoPlanner.open()` waits for it, with 15 s for the cold first load, before any test acts.
- Test: the existing `demo.spec.ts` tests: 5 cold dev-server runs and 380 warm runs (`--repeat-each 20`) all pass, against 1 failure in 3 cold runs before.
- Rule: the existing known mistake (wait for the visible precondition) now also names the chart on `/demo`.

## 22 October 2026: the reduced-motion particle test timed out on WebKit

- What broke: `forecast.spec.ts`, "reduced motion keeps the particle field static", failed on the `webkit-a11y` project in Checks for PR #14, which changed only `AGENTS.md`. Both attempts timed out waiting for `wind-particle-field`.
- Found by: Checks on PR #14. The trace shows the field arriving about 5.6 s after the assertion started, with `data-motion="static"`, so the product was right and late.
- Cause: the particle field waits for MapLibre's first `load`, which runs on software WebGL in CI WebKit and can take longer than the 5 s default assertion timeout. The test paid for a real map to check one attribute.
- Fix: the check moved down a level. Two component tests render `WindPreview` with a stub map container and a stubbed `prefers-reduced-motion` query, and the e2e test is gone. The animated case stays covered end to end in `forecast.spec.ts` on Chromium.
- Test: `wind-preview.browser.test.tsx`, "reduced motion: the particle field is drawn static" and "full motion: the particle field animates".
- Rule: test a behaviour at the lowest level that can prove it; an e2e test that waits on a slow dependency it does not exercise belongs lower. It follows the hydration race of 15 October and the forecast clock race on PR #12; the matching known-mistake line is in PR #14.

## 16 October 2026: a Google Fonts blip failed whole e2e shards

- What broke: three e2e runs on 16 October failed every test in a shard with `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. Re-running sometimes passed.
- Found by: Checks on the README and coverage pull requests.
- Cause: `next/font/google` downloads DM Sans and Outfit whenever the dev server compiles; when the runner's request to Google failed, no page compiled.
- Fix: the two latin variable font files Google serves are committed under `apps/web/app/fonts/` with their OFL licence and loaded with `next/font/local` from `fonts.ts`.
- Test: `fonts.test.ts`, "never loads fonts from Google at build time" and "ships every font file it declares".
- Rule: a build or test step never depends on a third-party download. It failed three runs in one morning, so it is now a known mistake in `AGENTS.md`.

## 16 October 2026: the dashboard showed a green run as red, and mutation and evals as n/a

- What broke: the first published dashboard gave e2e "133/134 pass" in red although Checks passed. One WebKit test had failed once and passed on retry, and `summarise` counted any failed attempt as a failure. Mutation and evals read "n/a": the job took the newest successful run of each workflow, and free evals runs upload no report.
- Found by: the owner, looking at the README badges.
- Cause: the fixture had no retried test, and the report lookup assumed every successful run uploads one.
- Fix: a test fails only on its last attempt; a passed retry counts as flaky, which turns the badge yellow and breaks the flake-free streak. The job looks up the newest unexpired `mutation-report` and `evals-report` artifacts from a run on `main` in this repository, so a branch or fork run cannot supply them.
- Tests: `dashboard.test.ts`, "counts a test that passed on retry as flaky, not failed" and "passes the e2e badge with a flaky note when a retry passed"; `harness.test.ts`, "feeds the dashboard the newest mutation and evals reports, not the newest run".

## 15 October 2026: the engineering dashboard could not read the type coverage report

- What broke: the first Checks run on `main` failed the Engineering dashboard job with `Unexpected token '>'`. `ci.yml` wrote `pnpm typecheck:coverage --json-output > reports/type-coverage.json`, and `pnpm run` prints a `> sprint-scout@ typecheck:coverage` banner before the script's output.
- Found by: the owner, after merging the test-hardening pull request.
- Cause: the dashboard job runs only on pushes to `main`, so no pull request run had ever read that file.
- Fix: `pnpm --silent typecheck:coverage`.
- Test: `harness.test.ts`, "writes JSON reports in workflows without the pnpm script banner".

## 15 October 2026: input lost in CI, from a remount and a hydration mismatch

- What broke: three e2e tests failed only on the slower CI runners. A target time typed while the forecast was loading vanished when it arrived, because `TargetSettings` sat in a different place in the tree for each state and remounted. On `/demo`, every planner time hydrated with different text (`08 Sept, 16:00` from Node, `08 Sep at 16:00` from Chromium), so React rebuilt the page and dropped any fill or key press made before that.
- Found by: the first e2e run on GitHub: `attempt.spec.ts` (saved target), `demo.spec.ts` (DST gap, arrow keys on WebKit).
- Cause: locale patterns come from each runtime's ICU data, which differs between Node and browsers; React keeps state only for an element at the same position in the tree.
- Fix: `TargetSettings` keeps one position in `wind-preview.tsx` in both states; the planner formats times with `formatZonedTime` in `components/time.ts`, built from numeric parts and a fixed month table.
- Tests: `wind-preview.browser.test.tsx`, "target: a time typed before the forecast lands is kept when it arrives"; `time.test.ts`, "formats a zoned time the same way whatever ICU data the runtime has".
- Rule: text rendered on both server and client never comes from a locale pattern. Second locale-dependent bug after the `localeCompare` sort, so it is now a known mistake in `AGENTS.md`.

## 15 October 2026: the first CI run failed on gates `pnpm verify` does not run

- What broke: on the first push, Checks failed in four jobs that only exist in CI. The OSV action ref `@v2` does not exist (tags are `v2.x.y`); `size-limit --json > reports/size.json` had no `reports/` directory on a fresh checkout; `pnpm audit --prod` found a critical Next.js advisory and three highs; coverage on `packages/analysis` was 99.68 %, because the zero-power branch of `solveSpeedAtPowerMps` was never run. The e2e report failed only because e2e was skipped behind Static gates.
- Found by: the owner, after the first push to GitHub.
- Cause: none of these gates is part of `pnpm verify`, and the workflows had never run before.
- Fix: OSV pinned to `v2.7.0`; `mkdir -p reports`; Next 16.4.1 and a `source-map-js` override; a zero-power test.
- Test: `ride-effect.test.ts`, "coasts at the free-rolling speed when no power is applied"; the audit and coverage gates themselves.
- Rule: run `pnpm test:coverage` and `pnpm audit:prod` before the first push of a workflow change; `pnpm verify` does not cover them.

## 12 October 2026: the fix loop would run fork code with the API key

- What broke: `review.yml`'s `@claude` fix job had no fork check, unlike the review job. A collaborator commenting on a fork pull request would run the fork's install scripts and tests with `ANTHROPIC_API_KEY` and `contents: write`.
- Found by: the background security review on the first commit.
- Fix: a `fix-origin` job reads the head repository from the pulls API; the fix job needs it to be this repository.
- Test: `harness.test.ts`, "runs the @claude fix loop only on pull requests from this repository".

## 11 October 2026: tests that could not fail

- What broke: nothing shipped broken, but twelve tests could not catch the regression they were named for. The worst: the no-cookie privacy check read `request.headers()`, which never includes cookies; the unreadable-storage test swallowed every error before Save. The rider profile also dropped unknown fields on save, against the storage contract in `docs/test-strategy.md`.
- Found by: a read-only Codex review of the suite. Each finding was confirmed by mutating the product and watching the test stay green.
- Fix: each test now fails on its mutation (see `intent/test-hardening/`). External requests no stub answers fail the test in Playwright and in Vitest browser mode. ESLint forbids `randomUUID` outside `newId()`, closing the second half of the 9 October entry below. `riderStorageValue` merges a save into the stored profile.
- Tests: `privacy.spec.ts` (credentials, drafted route), `faults.spec.ts` (unreadable storage, rate limit), `time.property.test.ts` (oracle and clock-change cases), `route-wind.test.ts` (row and byte caps), `rider.test.ts`, `library.migrations.test.ts`, `keyboard.spec.ts`, and the loading states in `wind-preview` and `terrain-panel` browser tests.
- Rule: prove a new test can fail by breaking the code it guards before trusting it green.

## 9 October 2026: saving a route crashed on a phone over HTTP

- What broke: `crypto.randomUUID is not a function` when saving a segment from a phone on the LAN dev server.
- Found by: the owner, testing on a phone at `http://192.168.4.23:3000`.
- Cause: `randomUUID` exists only in secure contexts; plain HTTP on a LAN address is not one.
- Fix: `newId()` in `apps/web/app/routes/library.ts` falls back to `getRandomValues`.
- Test: `library.test.ts`, `describe("newId")`, secure and fallback cases.

## 25 October 2026: workflow_run trusted fork runs

- What broke: nothing yet. `pages.yml` deployed after any successful Checks run whose head branch was named `main`, including a fork's pull request from its own `main`, and published that run's `dashboard` artifact, which the fork's edited `ci.yml` could write. `triage.yml` ran the paid model on failed fork runs, feeding it logs the fork controlled.
- Found by: a privacy and security review the owner asked for.
- Cause: a `workflow_run` `branches` filter matches the branch name, not the repository; `workflow_run` jobs carry secrets even for forks.
- Fix: Pages deploys only when the triggering run was a `push` in this repository; triage skips runs whose head repository is not this one.
- Test: `harness.test.ts`, "deploys only after a push to main in this repository" and the triage test.
- Rule: every `workflow_run` job that uses the triggering run's artifacts, logs or secrets checks `github.event.workflow_run.head_repository.full_name == github.repository`.

## 25 October 2026: the dashboard counted its own run as a failure

- What broke: "First-pass success" read 70 % on the dashboard for `9bfa4da`. The dashboard job lists the Checks runs on main while its own run is still going, and gh lists that run with conclusion `""`, not `null`. `pipelineSummary` filtered only `null`, so the run in progress counted as a completed failure, and as the latest run for "Checks duration".
- Found by: building the recent runs strip, which drew that run as a red bar.
- Fix: `pipelineSummary` drops any empty conclusion; the job fetches 31 runs so 30 completed remain.
- Test: `dashboard.test.ts`, "leaves out the run still in progress, which gh lists with an empty conclusion".

## 25 October 2026: the dashboard history never carried over

- What broke: the dashboard header read "1 run recorded" on every build since the initial import. The `pnpm dashboard` script passes `--history reports/dashboard/history.json`, CI appends `--history previous/history.json`, and the CLI's `option()` took the first flag. That file is absent on a fresh checkout, so every Checks run on main started from an empty history: trends had one point, and the bands, which compare a run with the runs before it, could never breach. The earlier history cannot be rebuilt, because each saved artifact holds one entry.
- Found by: the owner, asking whether "1 run recorded" meant only one run had been done. The job log said "(1 runs)".
- Fix: the last flag wins, so CI's `--history` overrides the script's default. The header now reads "Built from main at `<sha>` on `<date>` · trends over N days", because history keeps one entry per day, not per run.
- Test: `dashboard.cli.test.ts`, "keeps the history named by the last --history flag", runs the CLI twice as CI does.

## 25 October 2026: a fork's main could supply the dashboard

- What broke: nothing yet. The dashboard job's history fetch and the manual Pages rebuild picked the newest successful `ci.yml` run with `--branch main`. A fork's pull request from its own branch called main matches that filter and runs its own edited `ci.yml`, so it could upload a `dashboard` artifact that Pages publishes on the planner's origin. The Checks-triggered deploy was guarded earlier the same day; these two paths were not.
- Found by: the whole-repository review on 25 October 2026.
- Fix: both paths use the artifact query that checks `head_branch == "main"` and `head_repository_id == repository_id`.
- Test: `harness.test.ts`, "takes the dashboard artifact only from main in this repository".
- Rule for `AGENTS.md`: this is the second time a `--branch main` filter let a fork's run through (the first was the Pages trigger). Any workflow that reads another run's artifacts filters on the head repository, not the branch name.

## 25 October 2026: one bad effort could lock every saved segment

- What broke: effort matching rounds elapsed time to 0.1 s, so a crossing under 0.05 s was saved as `0`. The library rejects `elapsedSeconds: 0` and rejects the whole store with it, so the next load would report every saved segment as unreadable. Effort times were also compared as strings in any form `Date.parse` accepts, so the same instant with an offset and in UTC counted as two efforts.
- Found by: the whole-repository review (silent-failure and type passes).
- Fix: a 0.1 s floor on matched efforts; saved times must carry a zone and are read back in one UTC form.
- Test: `effort-match.test.ts`, "never reports an effort shorter than the 0.1 s it is rounded to"; `library.test.ts`, "saved effort times and wind".

## 25 October 2026: a hand-picked segment kept the board's hour

- What broke: after Open on the opportunity board, choosing another segment from the slot picker opened it at the board's hour, because the requested hour stayed set and every new forecast panel jumped to it.
- Found by: the whole-repository review (test-coverage pass).
- Fix: the slot picker clears the request; only Open sets it.
- Test: `e2e/board.spec.ts`, "a segment picked by hand after Open starts at its first hour".

## 25 October 2026: a malformed GPX file could freeze the page

- What broke: an unclosed `<trkpt>` made the track-point regex rescan the rest of the file for every opening tag. 200 000 unclosed tags (about 6 MB) took 76 s on the main thread. The importer also read a file of any size into memory before the 25 MB check, and the target field kept a stale draft after the stored target changed.
- Found by: the 25 October 2026 TypeScript review (F5, F6, F8).
- Fix: a forward-only scanner that rejects an unclosed point; `file.size` checked before reading; the target draft resyncs when the stored target changes.
- Test: `gpx.test.ts`, "rejects many unclosed track points without rescanning the file"; `efforts-panel.browser.test.tsx`, "a file over 25 MB is refused before it is read"; `target-settings.browser.test.tsx`, "the field follows a target changed elsewhere".
