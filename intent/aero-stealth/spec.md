# Spec: Aero Stealth redesign

## Behaviour

Nothing the user can do changes. Every control, label, empty state, error state and keyboard path stays as it is; only the look changes. The copy is today's copy, not the mock-up's text.

### Tokens

Defined once on `:root` in `globals.css`, replacing the light palette. Components use tokens, never raw colours.

| Token       | Value                                                                            | Use                                | Contrast on `--bg` / `--raised` |
| ----------- | -------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------- |
| `--bg`      | `#1E2A3A`                                                                        | page, sampled from the mock-up     |                                 |
| `--surface` | `#263345`; cards `rgba(41,54,72,0.85)` with a 1px `rgba(45,212,191,0.22)` border | cards                              |                                 |
| `--raised`  | `#2E3D52`                                                                        | controls, capsules                 |                                 |
| `--ink`     | `#FFFFFF`                                                                        | headings, values                   |                                 |
| `--muted`   | `#A5B4C8`                                                                        | labels, secondary text             | 6.88 / 5.23                     |
| `--accent`  | `#FC8B8B`                                                                        | links and selected text            | / 4.83                          |
| `--wind`    | `#38BDF8`                                                                        | wind, "Scout"                      | 6.77 / 5.14                     |
| `--data`    | `#2DD4BF`                                                                        | chart line and points, wind badge  | 7.79 / 5.92                     |
| `--best`    | `#EF4444`                                                                        | best hour fills, borders and glows | not used for text               |
| `--route`   | `#F97316`                                                                        | route line                         | not used for text               |
| `--night`   | `rgba(59,130,246,0.08)`                                                          | night bands                        |                                 |

- The brief's `#0B0F19` page was dropped after the owner compared it with the mock-up; the mock-up's slate navy is lighter, so muted and accent text are lighter too to hold AA on `--raised`. Text on a `--best` or `--route` fill is `--bg`-coloured or the fill is a border and glow only.
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
