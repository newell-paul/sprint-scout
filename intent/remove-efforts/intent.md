# Remove efforts and past wind

Status: accepted
Opened: 1 November 2026 by Paul Newell

## Problem

The planner now has two GPX imports that do different jobs. "From GPX" in the drawing bar makes a segment. "Import GPX ride" in the Your efforts panel matches a ride against the selected segment and saves the times. On 1 November 2026 the owner used the efforts import to make a segment, got "No traversal of this segment found", and chose to remove the efforts feature rather than rename it.

## Proposed outcome

- There's no Your efforts panel. That means no effort matching, no efforts list or best time, no past-wind consent, and no request to the Open-Meteo archive.
- "From GPX" is the only GPX import.
- Saved segments that hold efforts still load. The efforts are dropped and never break the library.
- The effort matcher, the archive loader, their contract, fixtures, stubs and tests are removed. Git history keeps them.
- The Open-Meteo archive host leaves the CSP. The e2e stub treats any archive request as unhandled, so the suite fails if one is made.

## Affected users and parts

- Riders with saved efforts: they lose them.
- `packages/analysis` (effort matcher), `packages/application` (archive loader; the GPX reader keeps its own point type), `packages/contracts` (archive schema).
- `packages/testing`: archive fixture, msw and Playwright stubs, drift check.
- `apps/web`: efforts panel, wind preview, route drawer, library, example segment, CSP, Clear data text, styles.
- e2e: efforts, privacy and drawing specs; page objects; ARIA baselines.
- `AGENTS.md`, `README.md`, `docs/`.

## Constraints

- No saved library breaks, whatever efforts it holds.
- Wind, shelter, target and estimates are unchanged.
- No new network request; one fewer endpoint.
- No Strava data.
- Static hosting, size and Lighthouse budgets.

## Open questions

None. The owner chose to remove the whole efforts feature on 1 November 2026.
