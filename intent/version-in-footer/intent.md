# Version in the footer

Status: done
Opened: 29 October 2026 by Paul Newell

## Problem

The version badge moved to the header (`intent/version-label/`), next to the wordmark. The owner wants the version back in the footer, where build details usually live, without it reading as OpenStreetMap's version again.

## Proposed outcome

The footer ends with the teal pill, now reading "SprintScout v0.9.0", so the app is named in the pill itself. The commit shows on hover. The header goes back to the wordmark and the unit switch. The owner chose this (option 2) from three rendered footer options on 29 October 2026.

## Affected users and parts

Every rider. `apps/web/app/routes/version-badge.tsx` and its component test, `route-drawer.tsx`, `apps/web/app/globals.css`, `e2e/version.spec.ts`, `docs/design.md`.

## Constraints

No request. The OpenStreetMap credit and its wording stay unchanged. The pill keeps a 44 px touch target, its accessible name includes its visible text, and the page doesn't scroll sideways on a phone.

## Open questions

None.
