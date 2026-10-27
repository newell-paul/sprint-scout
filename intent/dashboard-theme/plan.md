# Plan: dashboard in the planner's colours

## Files

- `packages/testing/src/dashboard.test.ts`: token parity with the planner and the card panel style.
- `packages/testing/src/dashboard.ts`: `:root` tokens, `body` background, `.card`, `.card[data-tone]`, `.card:hover`, `.column`.
- `docs/design.md`: dated entry.

## Order

1. Tests first, shown failing.
2. Stylesheet changes until they pass.
3. Render the dashboard locally at desktop and phone width and compare with the planner.
4. Docs, intent `done`, `pnpm verify`.

## Proof

- The new tests fail before the change and pass after.
- `pnpm verify` green.
