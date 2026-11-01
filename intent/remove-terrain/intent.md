# Remove terrain and Open-Meteo elevation

Status: done
Opened: 1 November 2026 by Paul Newell

## Problem

The terrain panel loads heights from Open-Meteo's Copernicus GLO-90, a 90 m surface model. On the short, low-relief segments SprintScout is for, that's noise:

- **Bridge to bridge – up** (Walton-on-Thames, 981 m): it reads 8 m on a bridge deck the rider's barometric GPX puts at 14.4 m. So it draws a 5 m climb where the rider descends 3.5 m. The profile comes out roughly upside down.
- **Richmond Park example**: tree canopy beside Sheen Cross Wood adds a 10 m spike.

Terrain-aware times inherit those errors. The owner judges that serious riders have a GPX with recorded heights, and that a GPX is the source worth supporting (`intent/segment-from-gpx`, draft).

## Proposed outcome

- There's no terrain panel, no elevation consent, no automatic terrain reload and no request to Open-Meteo's elevation endpoint.
- Every estimate uses the flat-road model, and it says so: "Flat road · Terrain not modelled".
- Saved segments that carry terrain, a terrain mode or an automatic-reload setting still load. Those fields are dropped and never break the library.
- All terrain code, tests, fixtures and docs go. Git history keeps them for the GPX work.
- GPX heights come later, in a separate intent.

## Affected users and parts

- Everyone who used terrain mode: their times change to flat road.
- `packages/analysis`: terrain physics.
- `packages/application`: the elevation loader, `route-wind` terrain input.
- `packages/testing`: the elevation handler, fixture, faults and call counts.
- `apps/web`: terrain panel, cockpit, wind preview, board, opportunities, library, example segment, route drawer, styles.
- e2e: terrain, privacy, keyboard and efforts specs.
- ARIA baselines.
- `AGENTS.md`, `README.md` and `docs/`.

## Constraints

- No saved library breaks, whatever terrain fields it holds.
- Flat-road estimates stay identical to today's flat-road mode.
- No new network requests. Open-Meteo stays in use for the forecast and the archive.
- No Strava data.
- Static hosting, and the size and Lighthouse budgets.

## Open questions

None. The owner chose removal now and GPX heights later, on 1 November 2026.
