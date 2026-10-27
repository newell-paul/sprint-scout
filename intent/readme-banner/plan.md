# Plan: README banner from the real logo

## Files

- `scripts/banner/banner.html`: the template. Loads `../../apps/web/app/fonts/inter-latin-variable.woff2` and `../../apps/web/app/components/logo-mark.svg`; sizes come from CSS variables the script sets; the screenshot arrives as a data URL in `--shot-image`.
- `scripts/render-banner.mjs`: checks the URL answers, screenshots the planner once the "Wind particles" toggle shows, then renders the template at each size and writes the JPEGs.
- `package.json`: `"banner": "node scripts/render-banner.mjs"`.
- `docs/images/banner.jpg` (replaced) and `docs/images/social-preview.jpg` (new), rendered by the script.
- `docs/design.md`: dated entry.

## Order

1. Template and script; render against the local dev server.
2. Compare the output with the v2 drafts the owner chose.
3. Docs, intent status `done`, `pnpm verify`.

## Proof

- `pnpm banner` writes both images at the stated pixel sizes; the social preview is under 1 MB.
- The images match the v2 drafts.
- `pnpm verify` green.
