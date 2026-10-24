# Map takes control only after a click

Status: done
Opened: 24 October 2026 by Paul Newell

## Problem

Moving the cursor over either map hands the scroll wheel to it: scrolling the page zooms the map instead. On a phone a one-finger drag over the map pans it, so the page cannot be scrolled past it.

## Proposed outcome

- Both maps (route drawing on `/`, route map on `/demo`) start inactive: the wheel and a one-finger drag scroll the page.
- A click or tap on the map activates it; wheel zoom, drag pan and pinch then work as before.
- The map deactivates when the mouse leaves it, when the user clicks or taps outside it, or when keyboard focus leaves it.
- Scrolling or dragging over an inactive map shows a short hint saying how to activate it.
- Clicks that place drawing points, and the zoom buttons and keyboard controls, keep working without activation.

## Affected users and parts

`packages/ui/src/maplibre.ts` (shared helper), `packages/ui/src/route-map.tsx`, `apps/web/app/routes/route-drawer.tsx`, map CSS, unit and e2e tests, `docs/design.md`.

## Constraints

No new network requests or dependencies. Static hosting unchanged. Size and Lighthouse budgets hold.

## Open questions

None. The owner chose release on mouse leave and the same tap-first rule on touch.
