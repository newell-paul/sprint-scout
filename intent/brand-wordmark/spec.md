# Spec: borderless Aero Stealth wordmark

## Behaviour

- The planner's `<h1>` holds an inline 32×32 viewBox SVG and the wordmark. The SVG is `aria-hidden`, so the heading's accessible name stays "SprintScout".
- The mark: two chevrons filled with a 135° gradient from #2DD4BF to #06B6D4, edged with a thin #5EEAD4 stroke; three teal speed streaks on the left at 55 % opacity; a #EF4444 swoosh drawn first, so it sits behind the chevrons and arcs over the right one. A teal drop-shadow glow, no background, border or tile.
- Wordmark: "Sprint" weight 800 white, "Scout" weight 600 in `--data` (#2DD4BF, already the teal token), no wrapping.
- Sizes: desktop mark 36 px and text 30 px with a 10 px gap; at the existing phone breakpoint, mark 30 px and text 24 px with an 8 px gap.
- No separate header band: the logo sits on the page background. The header layout, the units switch and the segment row, on its own row, are unchanged.
- The dashboard brand link uses the same SVG and colours in place of `logo-mark.png`. `logo-mark.png` stays as the dashboard favicon.
- `app/icon.png` and `app/apple-icon.png` are unchanged.

## Data and privacy

Nothing leaves the browser. The SVG is inline; no new asset or request.

## Calculations

None.

## Tests

- Component: the header logo renders an `aria-hidden` SVG and the heading's name is "SprintScout".
- Unit: `dashboard.test.ts` asserts the brand link holds the inline SVG and no `<img>`.
- ARIA snapshots: unchanged, because the SVG is hidden.
- Screenshot baselines that include the header are regenerated with `scripts/visual-baselines.sh`, never hand-edited.

## Docs

A dated entry in `docs/design.md`: "Borderless wordmark in the header".
