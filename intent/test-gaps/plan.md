# Plan: test gaps

## Files

- `apps/web/app/routes/route-drawer.tsx`: `pickSlot` clears the board request.
- The tests named in the spec; `docs/design.md`, `docs/lessons.md`.

## Order

1. C1 failing e2e, then the fix with the test lock on.
2. C2 to C5 tests (coverage for existing behaviour; each checked to pass).
3. Docs, status `done`.

## Proof

C1's test fails before the fix and passes after; `pnpm verify` green.
