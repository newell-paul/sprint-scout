# Plan: junction efforts

## Files

- `packages/analysis/src/effort-match.junction.test.ts`: new junction unit and property tests.
- `packages/analysis/src/effort-match.test.ts`: version expectation v3.
- `packages/analysis/src/effort-match.ts`: point gates for point-to-point start and finish beside the lines; version v3.
- `docs/design.md`, `docs/lessons.md`.

## Order

Failing tests first (bugfix skill, tests locked), then the matcher, then docs.

## Proof

New tests fail before and pass after; existing effort tests unchanged apart from the version; 100 % coverage in `packages/analysis`; `pnpm verify` green.
