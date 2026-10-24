# Spec: map takes control only after a click

## Behaviour

- On creation each map disables `scrollZoom`, `dragPan` and `touchZoomRotate`, and its container gets `data-map-active="false"`.
- Mouse: a `pointerdown` on the container (capture phase, so the same press can start a pan) activates the map. Leaving the container deactivates it.
- Touch and pen: a tap (`click`) on the container activates it; until then a one-finger drag scrolls the page.
- Any `pointerdown` outside the container, or focus moving outside it, deactivates the map.
- While inactive, a wheel over the map or a touch drag on it shows a hint for 1.5 s: "Click the map to zoom" (mouse) or "Tap the map to move it" (touch). The hint is `aria-hidden`; keyboard users are unaffected because MapLibre's keyboard handler and the zoom buttons stay enabled.
- Map `click` events (drawing points, selecting) are unchanged; the first click both activates and places a point.

## Data and privacy

No change; nothing new leaves the browser.

## Calculations

None.

## Tests

- Unit (`maplibre.test.ts`): the helper starts disabled, activates on mouse `pointerdown` and touch `click`, deactivates on mouse leave, outside pointerdown and focus leaving, ignores touch `pointerleave`, shows the hint only while inactive, and the returned cleanup removes every listener.
- E2E (`demo.spec.ts`): the map is inactive on hover, a click activates it, moving the mouse away deactivates it; a wheel over the inactive map scrolls the page.
- No ARIA snapshot changes (the hint is `aria-hidden`); visual baselines unchanged while the hint is hidden.

## Docs

`docs/design.md`: "Maps take control only after a click — 24 October 2026".
