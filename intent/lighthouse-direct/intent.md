# Lighthouse without Lighthouse CI

Status: accepted
Opened: 24 October 2026 by the owner

## Problem

- `@lhci/cli` 0.15.1 pins Lighthouse 12, whose puppeteer chain brings `extract-zip` 2.0.1. Two high advisories with no fixed release landed on it on 24 October; before that, `basic-ftp`, `sprintf-js` and `zod` 3 advisories came the same way and sit in `osv-scanner.toml` as ignores. Lighthouse CI is the largest source of advisory noise in a dev-only toolchain.
- The resource budget in `budgets.json` (script 650 KiB, total 900 KiB) is not enforced. Lighthouse 12 dropped the `performance-budget` audit, and Lighthouse CI passes an assertion on an audit that does not exist.

## Proposed outcome

- The deploy gate runs Lighthouse 13 directly: the same page, three desktop runs, the same score and timing thresholds, and the same pass rule.
- The resource budget is enforced again from the run's own network requests.
- `.lighthouseci/` keeps its manifest and reports in the same shape, so the dashboard and the CI artifacts are unchanged.
- `@lhci/cli` and its ignores leave the repository, and the two `extract-zip` alerts close.

## Affected users and parts

- Owner; CI's budgets job and the Pages deploy gate.
- `package.json`, `pnpm-lock.yaml`, `lighthouserc.json`, `budgets.json`, `osv-scanner.toml`.
- `packages/testing`: a new Lighthouse runner and its pure gate, with tests.
- `docs/design.md`, `docs/test-strategy.md`.

## Constraints

- Deterministic, tested gate logic; no change to the thresholds.
- No new external service; Chrome as installed on the runner.
- Same commands: `pnpm test:lighthouse`, `pnpm check:deploy`.

## Open questions

1. Lighthouse 13 scores differently from 12. If the planner falls below a threshold on 13, lower the threshold or fix the page? Resolved: fix the page or stop and ask; thresholds do not move in this work.
