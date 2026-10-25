# Plan: loop efforts

## Files

- `packages/analysis/src/effort-match.ts`: loop detection, no forward extension of the last leg on a loop, unwrapped positions across the seam, next lap searched from the finishing pair, version v2.
- `packages/analysis/src/effort-match.test.ts`: loop unit and property tests.
- `docs/design.md`, `docs/lessons.md`.

## Order

Failing tests first (bugfix skill), then the matcher, then docs.

## Proof

New tests fail before and pass after; existing effort tests unchanged apart from the version; 100 % coverage in `packages/analysis`; `pnpm verify` green.
