# Plan: push e2e checks down

## Files

- `apps/web/app/routes/wind-preview.browser.test.tsx`: 17 tests.
- `apps/web/app/routes/efforts-panel.browser.test.tsx`: 7 tests.
- `apps/web/app/routes/terrain-panel.browser.test.tsx`, `rider-settings.browser.test.tsx`, `opportunity-board.browser.test.tsx`, `clear-data.browser.test.tsx`, `apps/web/app/components/ride-cockpit.browser.test.tsx`, `apps/web/app/components/conditions.test.ts`: the other 8.
- `e2e/{faults,forecast,attempt,rider,shelter,efforts,terrain,board,privacy}.spec.ts`: 40 deletions; `e2e/pages/*`: unused members removed.
- `docs/test-strategy.md`.

## Order

1. Component and unit tests, three groups in parallel (wind preview; efforts panel; the rest), each run and shown able to fail.
2. Delete the 40 e2e tests and unused page-object members.
3. Docs, then `pnpm verify`.

## Proof

- Every new test passes, and fails against a temporary break of the behaviour it covers.
- `pnpm verify` green; the e2e count drops by 40 per desktop project run, the component count rises by 31, the unit count by 1.
