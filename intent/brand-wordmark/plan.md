# Plan: borderless Aero Stealth wordmark

## Files

- `apps/web/app/components/logo-mark.svg`: the new mark, one file for the planner and the dashboard.
- `apps/web/app/components/logo.tsx`: show `logo-mark.svg` at 52 px in place of the PNG tile (36 px in the first release).
- `apps/web/app/globals.css`: smaller mark and wordmark, teal glow, `--data` accent at weight 600, no wrap; phone sizes.
- `packages/testing/src/dashboard.ts`: the brand shows `logo-mark.svg` with the same colours and sizes.
- `packages/testing/src/dashboard.cli.ts`: copy `logo-mark.svg` beside the page too.
- `packages/testing/src/dashboard.test.ts`: assert the SVG brand.
- `e2e/library.spec.ts`: the heading's name and the decorative mark.
- `docs/images/logo-change.png`: the reference mock-up.
- `docs/design.md`: the dated entry.

## Order

1. Logo and CSS, shown to the owner on the local dev server (done as the example).
2. Owner accepted the example's choices; commit intent, spec and plan.
3. Dashboard brand and tests.
4. Add the design entry and set the status to done. No screenshot baseline shows the header.

## Proof

- The owner's check on `pnpm --filter @scout/web dev` at desktop and phone widths.
- `pnpm verify` green.
- `pnpm check:deploy` keeps the bundle under its ceiling.
