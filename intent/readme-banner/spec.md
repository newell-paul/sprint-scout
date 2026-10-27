# Spec: README banner from the real logo

## Behaviour

- `pnpm banner` (with the dev server running on :3000) opens the planner in Chromium at 1440 × 1000, waits for the example segment's "Wind particles" toggle, and screenshots it. The banner template crops that to the map and the "Find your window" chart, so the planner's own header and logo never appear twice.
- The template (`scripts/banner/banner.html`) draws on the planner's slate background with its blue and teal glows and faint horizontal lines: the italic logo (the planner's `logo-mark.svg`, "Sprint" Inter 800 white, "Scout" Inter 700 `#2dd4bf`, the group slanted 12° from its bottom-left), the tag line "Chase the Tailwind / Find your Window" with "Tailwind" in teal, the pills "Free on GitHub Pages" (teal, glowing) and "Cycling weather & segment analytics", and the screenshot tilted in perspective with a teal edge.
- Two outputs, each JPEG:
  - `docs/images/banner.jpg`: 1000 × 420 at 2× (2000 × 840), logo 46 px and tag line 46 px.
  - `docs/images/social-preview.jpg`: 1280 × 640 at 1×, logo 72 px and tag line 50 px.
- The script fails with a clear message when nothing answers on the URL, instead of rendering an empty frame. `BANNER_URL` overrides the default `http://127.0.0.1:3000/`.

## Data and privacy

The planner under the script makes the same first-visit requests it makes for any visitor (the example segment's forecast from Open-Meteo, OpenStreetMap tiles), from the owner's machine when the owner runs it. Nothing is added to the planner. The template loads only files from the repo.

Open question 1, resolved: live data. The banner should show the planner as it is; a fixture would need msw wired into a non-test run for a marketing image. The forecast curve and date in the image differ between runs, which is acceptable for a banner.

## Calculations

None.

## Tests

None automated. Open question 2, resolved: CI does not regenerate the images. They depend on a live forecast and map tiles, so a CI render would not be reproducible and would turn a network blip into a red build. The proof is the owner's review of the rendered images and `pnpm verify` green (lint, spell and knip cover the new script).

## Docs

`docs/design.md` entry "README banner rendered from the planner — 27 October 2026". The README alt text stays.
