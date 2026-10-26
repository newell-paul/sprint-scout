# Plan: app icon

## Files

- `apps/web/app/icon.png`, `apple-icon.png`, `components/logo-mark.png`: new; `app/icon.svg` removed.
- `apps/web/app/components/logo.tsx`: `next/image` of the mark, unoptimized for the static export, eager.
- `apps/web/app/globals.css`: drop the mark's drop-shadow.
- `packages/testing/src/dashboard.ts`: logo image and favicon link; the unused `--brand-data` token goes.
- `packages/testing/src/dashboard.cli.ts`: copy the logo with the fonts.
- `packages/testing/src/dashboard.test.ts`: logo and favicon assertions.

## Order

The owner checks the icons on the local dev server and a local dashboard build, then one commit.

## Proof

`pnpm build:static` emits both icon links under `/sprint-scout/`; `pnpm test:size` under its ceiling; `pnpm verify` green.
