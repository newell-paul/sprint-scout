# Spec: map takes control only after a click

## Behaviour

- On creation each map disables `scrollZoom`, `dragPan` and `touchZoomRotate`, and its container gets `data-map-active="false"`.
- Mouse: a `pointerdown` on the container (capture phase, so the same press can start a pan) activates the map. Leaving the container deactivates it; if a button is held (a pan dragged past the edge), it deactivates when the button comes up outside the map instead.
- Touch and pen: a tap (`click`) on the container activates it; until then a one-finger drag scrolls the page.
- Any `pointerdown` outside the container, or focus moving outside it, deactivates the map.
- While inactive, a wheel over the map or a touch drag on it shows a hint for 1.5 s: "Click the map to zoom" (mouse) or "Tap the map to move it" (touch). The hint is `aria-hidden`; keyboard users are unaffected because MapLibre's keyboard handler and the zoom buttons stay enabled.
- On the drawing map the click that activates it places no point; the next click does. The helper reports the activating press once (`takeActivation()`), and the drawing map's click handler skips it. A tap activates in the capture phase, before MapLibre turns it into a map click.
- While the drawing map holds at least one point, the mouse leaving does not release it (`holdOnLeave`); a press outside or focus leaving still does.
- While the mouse rests on the inactive drawing map it shows "Click to use the map", hidden on leave or activation.
- Other map `click` events (selecting on `/demo`) are unchanged.

## Data and privacy

No change; nothing new leaves the browser.

## Calculations

None.

## Tests

- Unit (`maplibre.test.ts`): the helper starts disabled, activates on mouse `pointerdown` and touch `click`, deactivates on mouse leave, outside pointerdown and focus leaving, ignores touch `pointerleave`, shows the hint only while inactive, reports the activating press exactly once for mouse and touch, honours `holdOnLeave`, shows the hover hint only for a resting mouse on the inactive map, and the returned cleanup removes every listener.
- E2E (`drawing.spec.ts`): the activating click places no point and the next one does; with a point drawn the map stays active when the mouse leaves; with none it releases.
- E2E (`demo.spec.ts`): the map is inactive on hover, a click activates it, moving the mouse away deactivates it; a drag past the edge keeps control until the button comes up; a wheel over the inactive map scrolls the page.
- No ARIA snapshot changes (the hint is `aria-hidden`); visual baselines unchanged while the hint is hidden.

## Docs

`docs/design.md`: "Maps take control only after a click — 24 October 2026".
