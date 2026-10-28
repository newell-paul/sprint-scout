# Add segment flow

Status: draft
Opened: 28 October 2026 by Paul Newell

## Problem

Adding a segment feels like a trap.

- "Add segment" opens an empty slot in drawing mode with no way back. Nothing on screen says how to leave apart from picking another slot.
- Once the first point is down, the slots lock ("Save or cancel your drawing before switching segments") and the board hides. The only way out is "Cancel drawing" at the end of the editor, below the map and the coordinate tools, often off screen on a phone.
- Saving needs a name and an independent-source confirmation tick as well as the points, so a first-time rider meets several steps before anything happens.
- Most riders already have their segments in Strava. Drawing one again by hand on a map is slow and less accurate than the segment they already know.

## Proposed outcome

Findings and a proposal, then a build intent from them:

- Starting a new segment is easy to back out of at every step, from where the rider is looking, on desktop and phone.
- Drawing is quicker: fewer required steps before Save, clear progress, and an obvious way to undo.
- A ranked list of ways to bring in a segment the rider already knows, each with its data-rights position: drawing on the map, entering coordinates, a GPX of the rider's own route or activity, a Strava export the rider makes themselves, and the official Strava MCP outside the app. Anything that needs Strava's API inside the app is listed as not allowed, with the reason.
- A short look at how other route and segment tools handle "add" and "cancel".

## Affected users and parts

Every rider adding a segment, first-time riders most. `apps/web/app/routes/route-drawer.tsx`, `segment-slots.tsx`, `library.ts` (if GPX becomes a segment source), the drawing e2e specs and ARIA baselines, `docs/design.md`, and `docs/integration-decisions.md` for any new import path.

## Constraints

No Strava data, tokens or credentials in the app, and no Strava API call from it. `docs/design.md` says a file exported from Strava is not automatically an independent source, so any Strava-file path needs an owner decision recorded before it is built. Every network request follows a user action. Segments stay in the browser. The 20-segment and 500-point limits hold unless the owner changes them.

## Open questions

1. Can a GPX the rider exports from their own Strava route or activity be used as segment geometry, and on what confirmation? This needs a dated owner decision in `docs/integration-decisions.md`.
2. Should a GPX already imported for efforts be able to create a segment from part of the ride?
3. Should the independent-source confirmation stay as a tick per segment, become a one-time acknowledgement, or move?
4. Should an abandoned drawing be kept as a draft to come back to, or simply discarded?
5. Does Cancel need a confirmation once points are placed, or is an undo enough?
