# Spec: app icon

## Behaviour

- The planner's favicon is a 64 px PNG of the new icon (`app/icon.png`), replacing `app/icon.svg`.
- `app/apple-icon.png` is 180 px with a solid background and square corners; iOS rounds them. Next emits the `apple-touch-icon` link with the base path.
- The page logo is the new icon as a 56 px image (40 px on mobile), from a 168 px PNG for sharp rendering at 3×. Its drop-shadow is removed, because the artwork has its own glow. The image has empty alt text, because the wordmark beside it names the app.
- The dashboard uses the same PNG for its logo and favicon, copied next to the page with the fonts.

The images are cut from `docs/images/icon.png`: the rounded square is cropped without the white margin, given transparent corners, and scaled down.

## Data and privacy

No new request leaves the site's origin.

## Calculations

None.

## Tests

`dashboard.test.ts`: the brand link carries the logo image and the page links the favicon. The ARIA snapshots are unchanged, because the old mark was `aria-hidden` and the new image has empty alt text. No screenshot baseline shows the header.

## Docs

None: no behaviour or architecture change worth a design entry.
