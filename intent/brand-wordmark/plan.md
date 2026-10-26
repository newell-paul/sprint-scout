# Plan: borderless Aero Stealth wordmark

## Files

- `apps/web/app/components/logo.tsx`: replace the `next/image` tile with the inline SVG mark.
- `apps/web/app/globals.css`: smaller mark and wordmark, teal glow, `--data` accent at weight 600, no wrap; phone sizes.
- `packages/testing/src/dashboard.ts`: the brand uses the same SVG and colours; the CSS targets `.brand svg`.
- `packages/testing/src/dashboard.test.ts`: assert the inline SVG brand.
- A component test for the logo's accessible name.
- Header screenshot baselines, regenerated.
- `docs/design.md`: the dated entry.

## Order

1. Logo and CSS, shown to the owner on the local dev server (done as the example).
2. Owner accepted the example's choices; commit intent, spec and plan.
3. Dashboard brand and tests.
4. Regenerate baselines, add the design entry, set the status to done.

## Proof

- The owner's check on `pnpm --filter @scout/web dev` at desktop and phone widths.
- `pnpm verify` green, including the regenerated baselines.
- `pnpm check:deploy` keeps the bundle under its ceiling.
