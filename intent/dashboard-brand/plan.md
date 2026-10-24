# Plan: Dashboard brand

From [spec.md](spec.md).

## Files

- `packages/testing/src/dashboard.ts`: `@font-face` rules, font stacks, light and dark brand colours, the logo in the header.
- `packages/testing/src/dashboard.cli.ts`: copies `inter-latin-variable.woff2`, `jetbrains-mono-latin-variable.woff2` and `OFL.txt` from `apps/web/app/fonts/` into `<out>/fonts/`, both when building and when refreshing the board.
- `packages/testing/src/dashboard.test.ts`: the tests in the spec.

## Order

1. Test first: the new render assertions fail.
2. Styles and header in `dashboard.ts`; the tests pass.
3. The font copy in the CLI.
4. Build the dashboard locally for the owner's check.

## Proof

- The new tests fail first, then pass.
- `pnpm dashboard` writes `reports/dashboard/fonts/`, and the page renders in Inter with the logo (owner checks locally).
- `pnpm verify` green.

## As built

- After the owner's first look the header grew: a 56 px mark and a 2.4 rem wordmark, the planner's desktop sizes, and a 2.1 rem `h1`. At 600 px and below they drop to 40 px, 1.7 rem and 1.6 rem, as the planner's do.
