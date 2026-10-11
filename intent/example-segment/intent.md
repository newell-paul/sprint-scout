# Example segment on first visit

Status: done
Opened: 9 October 2026 by the owner

## Problem

A first-time visitor sees an empty planner and a drawing hint. Nothing shows what the app does until they draw and confirm a segment themselves.

## Proposed outcome

The planner opens with one real segment selected, forecast loaded, hour slider live. The visitor can delete it from Manage, and it does not come back.

## Affected users and parts

First-time visitors. `apps/web/app/routes/route-drawer.tsx` (initial load), a new `example-segment.ts`, the README, `docs/design.md`, the Playwright fixtures and one e2e scenario.

## Constraints

No Strava data: the owner gave a start and finish, and the geometry must come from OpenStreetMap. Consent model: the first-visit forecast request carries only the example's fixed start coordinate. Existing drawing tests must still start from an empty slot.

## Open questions

1. Button or automatic? Resolved: automatic on first visit; the owner rejected a "Load example" button.
2. Does a deleted example return? Resolved: no. An emptied library is `[]`, an absent key is a first visit.
