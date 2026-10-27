# Map credit

Status: accepted
Opened: 27 October 2026 by Paul Newell

## Problem

The map's credit ("MapLibre | © OpenStreetMap contributors") has a second, clipped (i) icon under the first. The app's `button { min-height: 44px }` stretches MapLibre's 24 px info button to 44 px, and its icon is a repeating background image, so the icon tiles a second time and the map's rounded corner cuts it off (measured: 44 px tall now, 24 px with the fix). The full credit text also stays over the map until the rider drags it, which on a small map covers the route.

## Proposed outcome

One (i) icon, inside the credit pill. The credit shows in full when the map loads, then shrinks to the (i) after five seconds or as soon as the map is dragged, on every screen size. Tapping the (i) shows the text again.

## Affected users and parts

`apps/web/app/globals.css`, `apps/web/app/routes/route-drawer.tsx`, a new e2e spec, `docs/design.md`, `docs/lessons.md`.

## Constraints

OSMF attribution guidelines: the credit must be visible without interaction, in a corner of the map, and may collapse automatically after five seconds or on map interaction if an (i) in the corner brings it back. No new network request.

## Open questions

None.
