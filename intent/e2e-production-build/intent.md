# End-to-end suite on a production build, with page objects

Status: accepted
Opened: 20 October 2026 by the owner

## Problem

CI runs Playwright against `next dev`. On the `main` run of 20 October 2026 the chromium-desktop median was 10.5 s per test and the slowest 22.9 s; the same tests take 1 to 3.5 s locally. Per-worker timings show the cause: the first test in each worker takes 16 to 20 s while the dev server compiles `/`, and every worker stalls again to 18 to 22 s when `demo.spec.ts` first requests `/demo`. The rest run at 6 to 10 s on a 4-vCPU runner shared by four browsers and an unminified dev build. The dashboard's "slowest ten" therefore reports compile time, not slow tests.

The specs themselves are hard to read: 119 tests across 16 files drive the page through raw locators and a handful of loose helpers in `e2e/fixtures.ts`, so setup, action and check run together and the same selectors repeat across files.

## Proposed outcome

- CI e2e runs against `next build` and `next start`, so no test pays for a route compile and timings reflect the app as shipped.
- Every spec reads through page objects: one per screen or panel, owning its locators and user actions, exposed as Playwright fixtures.
- Every test follows arrange, act, assert, separated by a blank line, with one behaviour per test.
- Every test is atomic: it creates its own state through fixtures, depends on no other test and on no order, and passes under `fullyParallel` with any worker count and with `--repeat-each`.
- Coverage is unchanged: every behaviour checked today is still checked, and the ARIA snapshots and visual baselines stay as they are.

## Affected users and parts

No user-facing change. `playwright.config.ts`, `.github/workflows/ci.yml` (e2e job), `e2e/fixtures.ts`, a new `e2e/pages/` directory, all 16 `e2e/*.spec.ts` files, `docs/test-strategy.md`, and a dated entry in `docs/design.md`.

## Constraints

No product source changes. Every request stays stubbed locally; the privacy tests keep asserting it. Tests stay deterministic: frozen clock, seeded data. ARIA snapshots and screenshots are regenerated only by the test runner, never by hand. The local loop stays fast.

## Open questions

1. Local runs: keep `next dev` locally for speed and use the production build only in CI, or use the production build everywhere? Resolved by the owner: dev locally, production build in CI.
2. Atomic: split tests that check several behaviours into one test each, or keep a journey as one test when its steps only make sense together? Resolved by the owner: split where the behaviours are independent; keep a short journey as one test only when later steps need the earlier ones.
3. Arrange, act, assert: blank lines or `// Arrange` comments? Resolved by the owner: blank lines only.
