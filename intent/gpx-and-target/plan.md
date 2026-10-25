# Plan: GPX robustness and target sync

## Files

- `packages/application/src/gpx.ts`: replace the global track-point regex with a forward scanner using `indexOf`; reject an unclosed point.
- `packages/application/src/gpx.test.ts`: unclosed-point tests.
- `apps/web/app/routes/efforts-panel.tsx`: check `file.size` before `file.text()`.
- `apps/web/app/routes/efforts-panel.browser.test.tsx`: oversized-file test.
- `apps/web/app/routes/target-settings.tsx`: resync the draft when `target` changes, during render.
- `apps/web/app/routes/target-settings.browser.test.tsx`: prop-change test.
- `docs/design.md`, `docs/lessons.md`.

## Order

Failing tests first (bugfix skill), then the three fixes, then docs.

## Proof

The new tests fail before and pass after; `pnpm verify` green.
