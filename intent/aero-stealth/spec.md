# Spec: Aero Stealth redesign

## Behaviour

Nothing the user can do changes. Every control, label, empty state, error state and keyboard path stays as it is; only the look changes. The copy is today's copy, not the mock-up's text.

### Tokens

Defined once on `:root` in `globals.css`, replacing the light palette. Components use tokens, never raw colours.

| Token            | Value                                                              | Use                               | Contrast on `--bg`              |
| ---------------- | ------------------------------------------------------------------ | --------------------------------- | ------------------------------- |
| `--bg`           | `#0B0F19`                                                          | page                              |                                 |
| `--panel-bg`     | `#131927` at 85 % over `--bg`, 1px `rgba(148,163,184,0.12)` border | cards                             |                                 |
| `--panel-raised` | `#1E293B`                                                          | controls, capsules                |                                 |
| `--ink`          | `#FFFFFF`                                                          | headings, values                  | 19.15                           |
| `--muted`        | `#94A3B8`                                                          | labels, secondary text            | 7.47 (5.71 on `--panel-raised`) |
| `--wind`         | `#38BDF8`                                                          | wind, "Scout"                     | 8.94                            |
| `--data`         | `#2DD4BF`                                                          | chart line and points, wind badge | 10.29                           |
| `--best`         | `#EF4444`                                                          | best hour, segment glow           | 5.09                            |
| `--route`        | `#F97316`                                                          | route line                        | 6.83                            |
| `--night`        | `rgba(59,130,246,0.08)`                                            | night bands                       |                                 |

- `#64748B` is not used for text (3.07 to 4.02). White on `--best` is 3.76, so text on a crimson fill is `--bg`-coloured or the fill is a border and glow only. Text on `--data` and `--route` fills is `--bg` (10.29 and 6.83).
- Radii: 16px cards, 12px inner panels, 8px controls, full for pills. Glows are `box-shadow` with the accent at 35 % or less.
- Type: Inter (`--font-body`) for text; JetBrains Mono (`--font-mono`) with tabular figures for every number, time and unit. The display font becomes Inter at heavier weight; Outfit and DM Sans are removed.

### Screens

1. Header: chevron logo in `--data`, "Sprint" in `--ink`, "Scout" in `--wind`. Saved segments as pills; the selected pill has a `--best` border and glow. "Add segment" is a raised button. The km/h and mph toggle is a two-option pill.
2. Map: the OSM raster is darkened with paint only (`raster-brightness-min` above `raster-brightness-max` to invert, `raster-hue-rotate`, `raster-saturation` and `raster-contrast` to land on navy). Route in `--route` with a wider, blurred line beneath it for the glow. Direction arrows in `--ink` with a dark outline. Start and Finish labels as small raised pills. Wind badge in `--data`. The hint from the click-to-activate work uses the new tokens.
3. Timeline card: Today, Tomorrow and Best hour as capsules (Best hour in `--best`); the dry daylight filter as a toggle pill; the chart line in `--data` with `--data` points; night bands in `--night`; the scrub handle glows; the best-hour line reads in mono.
4. Target card and the other panels (terrain, efforts, shelter, rider, opportunity board, conditions detail): same card, header and control styles. Inputs are raised, with a `--wind` focus ring at least 3:1 against the card.
5. Analytics row: three cards on desktop, stacked on mobile. Speed dial as a radial gauge, estimated time as a large mono value, wind compass with an aerospace ring and tick marks. Same data, same accessible names.
6. Motion: 150 to 200 ms transitions on hover, focus and selection. `prefers-reduced-motion: reduce` removes them and any animated glow.
7. Mobile (360px wide and up): one column, 16px gutters, no horizontal scroll, header pills scroll inside their own row.
8. `/demo`: the same tokens; its light theme and theme switch are removed.

## Data and privacy

No change. No new requests: fonts are local files, tiles are the existing OSM raster. The privacy e2e tests must still pass unchanged.

## Calculations

None.

## Tests

- Unit and component tests: unchanged except where a test asserts a colour or theme; those follow the tokens.
- E2E: existing suites pass unchanged. The demo theme test and the "demo planner in the light theme" visual test are removed in stage 7, with a dated note.
- ARIA snapshots: change only where markup changes (header pills, units toggle, analytics cards), regenerated by the runner and reviewed in the diff.
- Visual baselines (`pnpm test:visual:update`, Docker): regenerated once at the end, after the owner accepts the design, not per stage.
- Contrast: a unit test reads the token values from `globals.css` and checks each text pairing in the table above against 4.5:1 (3:1 for focus rings and large text).
- Lighthouse and size: `pnpm check:deploy` at the end of every stage.

## Docs

`docs/design.md`: "Aero Stealth: dark planner, Inter and JetBrains Mono, darkened OSM raster" with the final date. `docs/images/new-design.png` is committed as the reference.
