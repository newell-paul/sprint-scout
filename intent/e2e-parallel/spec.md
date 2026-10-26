# Spec: start end-to-end tests alongside the other gates

## Behaviour

- The `e2e` job in `ci.yml` needs only `playwright-image`. Its steps, shards, container and report are unchanged.
- The `e2e-report` and `dashboard` jobs keep their own `needs`, so the dashboard still waits for every gate.
- Branch protection is unchanged: each gate is a required check of its own.

## Data and privacy

No change.

## Calculations

None.

## Tests

`harness.test.ts`: the `e2e` job needs `playwright-image` and none of `static`, `unit` or `component`.

## Docs

`docs/design.md`: "End-to-end tests start alongside the other gates". `docs/test-strategy.md`: the CI row says the e2e shards run in parallel with the other gates.
