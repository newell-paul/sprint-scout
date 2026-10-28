# Plan: wordmark gap

## Files

- `apps/web/app/globals.css`: `.logo-word-accent` gets `margin-left: 0.09em`.
- `packages/testing/src/dashboard.ts` and `dashboard.test.ts`: `.brand b` gets the same margin, and the test asserts it.
- `scripts/banner/banner.html`: `.logo b` gets the same margin.
- `docs/images/banner.jpg` and `docs/images/social-preview.jpg`: re-rendered by the owner with `pnpm banner`, because the render needs a live forecast and map tiles that the agent's sandbox cannot reach.
- `docs/design.md`.

## Order

1. Test first, then the three style changes.
2. Design entry.
3. `pnpm verify`.
4. Owner runs `pnpm banner` against the dev server and commits both images to this branch.

## Proof

- `dashboard.test.ts` fails before the change and passes after it.
- `pnpm verify` green.
