# Plan: loop efforts

## Files

- `packages/analysis/src/effort-match.ts`: loop detection; on a loop, neither end extended, samples beyond the shared point flagged with their distance, positions unwrapped across it in both directions, gates and crossing times from the closest approach of the line between two samples, the next lap searched from the finishing pair; version v2.
- `packages/analysis/src/effort-match.test.ts`: loop unit and property tests.
- `docs/design.md`, `docs/lessons.md`.

## Order

Failing tests first (bugfix skill), then the matcher, then docs.

## Proof

New tests fail before and pass after; existing effort tests unchanged apart from the version; 100 % coverage in `packages/analysis`; `pnpm verify` green.
