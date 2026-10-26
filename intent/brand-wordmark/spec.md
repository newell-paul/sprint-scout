# Spec: borderless Aero Stealth wordmark

## Behaviour

- The planner's `<h1>` holds the mark, `apps/web/app/components/logo-mark.svg` (32×32 viewBox), as a decorative image (`alt=""`), and the wordmark, so the heading's accessible name stays "SprintScout". One SVG file serves the planner and the dashboard, so they can't drift.
- The mark: two chevrons filled with a 135° gradient from #2DD4BF to #06B6D4, edged with a thin #5EEAD4 stroke; three teal speed streaks on the left at 55 % opacity; a #EF4444 swoosh drawn first, so it sits behind the chevrons and arcs over the right one. A teal drop-shadow glow, no background, border or tile.
- Wordmark: "Sprint" weight 800 white, "Scout" weight 600 in `--data` (#2DD4BF, already the teal token), no wrapping.
- Sizes: desktop mark 52 px and text 42 px with a 14 px gap; at the existing phone breakpoint, mark 40 px and text 32 px with a 10 px gap. The first release used 36/30 and 30/24 px; the owner found that too small and approved these on 26 October 2026.
- No separate header band: the logo sits on the page background. The header layout, the units switch and the segment row, on its own row, are unchanged.
- The dashboard brand link shows the same `logo-mark.svg`, copied beside the page like the fonts, with the same colours and sizes. `logo-mark.png` stays as the dashboard favicon.
- `app/icon.png` and `app/apple-icon.png` are unchanged.

## Data and privacy

Nothing leaves the browser. The SVG is served from the site's own origin in place of the PNG, so the request count is unchanged.

## Calculations

None.

## Tests

- E2E (`library.spec.ts`): the level-one heading's name is "SprintScout", it holds no image role, and the mark's source is the SVG. A component test isn't possible because `logo.tsx` loads `next/font/local`.
- Unit: `dashboard.test.ts` asserts the brand link shows `logo-mark.svg` at 52 px.
- ARIA snapshots: unchanged, because the image is decorative.
- Screenshot baselines: none cover the header (they show the dial, compass and timeline), so none change.

## Docs

A dated entry in `docs/design.md`: "Borderless wordmark in the header".
