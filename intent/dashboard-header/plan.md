# Plan: dashboard header in one row

## Files

- `packages/testing/src/dashboard.ts`: header markup, GitHub mark, `grid` variant for the pipeline, stylesheet.
- `packages/testing/src/dashboard.test.ts`: header, GitHub link and URL check.
- `docs/design.md`: entry.

## Order

1. Markup and stylesheet; local preview rendered from the live history for the owner.
2. Tests.
3. Design entry, then `pnpm verify`.

## Proof

- `pnpm exec vitest run packages/testing/src/dashboard.test.ts` passes.
- Owner's check of the local preview at desktop and phone widths.
- `pnpm verify` green.
