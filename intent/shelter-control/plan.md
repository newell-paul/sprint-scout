# Plan: shelter as one segmented control

## Files

- `apps/web/app/routes/shelter-settings.tsx`: wrap " wind reduction" in its own span so it can be hidden visually on unchosen segments.
- `apps/web/app/globals.css`: `.shelter-choices` becomes the track, buttons become segments, the reduction caption sits below each segment; the chosen outline and glow.
- `apps/web/app/routes/shelter-settings.browser.test.tsx`: the caption test.
- `docs/design.md`: dated entry.

## Order

1. Component test first, shown failing.
2. Markup and styles; component tests and ARIA baselines unchanged.
3. Check desktop and 390 px on the dev server; owner's manual check.
4. Docs, intent `done`, `pnpm verify`.

## Proof

- New test fails before and passes after; existing shelter component and e2e tests pass unchanged.
- `pnpm verify` green.
