# Lessons

One entry per bug that reached `main` or a shipped build, newest first. Each names the test that now catches it. When a class of mistake appears twice, it also becomes a line under "Known mistakes" in `AGENTS.md`.

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
