# Stale intent check

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

`intent/review-single/` merged with its code in pull request #46 but stayed at `Status: in build`, so the dashboard's intent board showed one card in build for five hours after the work shipped, until pull request #53 fixed it. Nothing checks the status when the code merges: setting it to `done` is a step in the `intent` skill's Finishing section, and it was missed.

## Proposed outcome

- A pull request that leaves an intent built but not finished fails Checks, so it cannot merge green.
- "Built but not finished" means the status is `in build`, or the folder has a `plan.md` and the status is anything but `done` or `dropped`. A plan is committed with the work, so on the merge result it means the work is there.
- An intent at `accepted` with no plan stays legal on `main`: it is the backlog the spec drafts workflow reads.
- The failure names each intent and says what to set.

## Affected users and parts

- `packages/testing`: a small pure check, its tests and a CLI.
- `.github/workflows/ci.yml`: one step in Static gates.
- `package.json`: a `check:intents` script.
- `docs/design.md`: a dated entry.

## Constraints

No network, no paid step, no schedule. Deterministic from the files on the tree.

## Open questions

1. Should `pnpm verify` run it locally?
2. Should the dashboard also flag a stale card?
