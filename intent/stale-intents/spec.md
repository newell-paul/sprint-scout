# Spec: Stale intent check

From [intent.md](intent.md).

## Behaviour

- `pnpm check:intents` reads every `intent/<slug>/intent.md` and exits 1 when any intent is stale, printing one line per intent, for example `intent/review-single: Status is "in build"; set it to done or dropped in the pull request that ships it.`
- Stale: the status is `in build`, or `plan.md` exists and the status is not `done` or `dropped`. Draft and accepted intents without a plan pass.
- It runs in the Static gates job of Checks, on pull requests and on `main`. On a pull request it checks the merge result, so the intent must be finished before the merge, which is stronger than flagging it after.
- With nothing stale it prints nothing and exits 0.

## Open questions resolved

1. Not in `pnpm verify`. Staged work on one branch commits with the intent `in build` and runs verify at each stage (the Aero Stealth build had nine). CI is the gate that matters, at the point a pull request can merge.
2. No. With the gate in place a stale card cannot reach `main`; the board needs no new state.

## Data and privacy

Reads repository files only. No network.

## Calculations

None.

## Tests

- `packages/testing/src/intents.test.ts`: in build fails; accepted, draft or unknown with a plan fails; done and dropped with a plan pass; draft and accepted without a plan pass; the messages name the slug and status.
- `harness.test.ts`: the Static gates job runs `pnpm check:intents`.

## Docs

A `docs/design.md` entry, "Stale intent check — 25 October 2026".
