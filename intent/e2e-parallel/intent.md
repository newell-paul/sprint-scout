# Start end-to-end tests alongside the other gates

Status: accepted
Opened: 26 October 2026 by Paul Newell

## Problem

Checks takes about six minutes on main. The four end-to-end shards wait for the static gates (about 1.5 minutes), both unit shards and the component tests (about 1 minute) before they start, although none of their steps uses anything those jobs produce. The waiting puts about 1.5 minutes on every run's critical path. Building the app once for the shards was measured on 26 October 2026 and would save only about 10 seconds, because `next build` takes 13 seconds per shard.

## Proposed outcome

The end-to-end shards start as soon as the Playwright image is named, in parallel with the static, unit, component and deploy-gate jobs. A typical Checks run on main finishes about 1.5 minutes sooner. A pull request still cannot merge unless every gate passes.

## Affected users and parts

`.github/workflows/ci.yml` (the `e2e` job's `needs`), `packages/testing/src/harness.test.ts`, `docs/design.md`, `docs/test-strategy.md`.

## Constraints

No gate is dropped or made advisory. Runner minutes on a failing run rise by up to the four e2e shards (about 8 minutes) when a static or unit failure would have stopped them before; the repository is public, so runner minutes are free.

## Open questions

None; the owner chose this over building once on 26 October 2026.
