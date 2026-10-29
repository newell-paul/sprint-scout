# Visual baselines job

Status: accepted
Opened: 29 October 2026 by Paul Newell

## Problem

A layout change that shifts a screenshotted element fails the `@visual` tests until someone regenerates `e2e/__screenshots__` in the Playwright container (`pnpm test:visual:update`). That needs Docker on the owner's Mac and the right branch checked out (PR #94 waited on it, and the first attempt ran on the wrong branch). Agents can't do it: their sandbox can't pull the container, download the matching browser or fetch CI's screenshots.

## Proposed outcome

A "Visual baselines" workflow, started by hand or by an agent through the API, renders the baselines for a pull request's branch in the same container Checks uses. It commits them to that branch as a signed commit and runs Checks on the new commit. Nobody needs Docker, and an agent can finish a pull request whose only failure is a stale baseline.

## Affected users and parts

The owner and agents. `.github/workflows/visual-baselines.yml` (new), `.github/workflows/ci.yml` (a `workflow_dispatch` trigger, so the new commit gets Checks), a small commit script in `packages/testing`, `AGENTS.md`, `docs/test-strategy.md`, `docs/sdlc.md`, `docs/design.md`.

## Constraints

No schedule. It never writes to `main`, never force-pushes and only changes files under `e2e/__screenshots__`. Baselines are still made by the test runner, never by hand. Free: no model, no secret beyond the job token. About three minutes per run.

## Open questions

None: owner accepted the design on 29 October 2026 (a hand-started workflow that commits back and re-runs Checks).
