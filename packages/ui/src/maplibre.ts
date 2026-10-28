import type * as MapLibre from "maplibre-gl";

// MapLibre 6 finds its worker from import.meta.url, which bundlers rewrite to
// a non-http value, so the worker silently fails and GeoJSON layers never
// paint. Next serves the worker and its shared chunk from public/maplibre
// (copied at build time).
let loading: Promise<typeof MapLibre> | undefined;
const defaultWorkerUrl = () => {
  const base =
    typeof process === "undefined"
      ? ""
      : (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  return `${base}/maplibre/maplibre-gl-worker.mjs`;
};
export function loadMapLibre(): Promise<typeof MapLibre> {
  // A failed import is not cached, so a retry can succeed once the network does.
  loading ??= import("maplibre-gl")
    .then((lib) => {
      lib.setWorkerUrl(defaultWorkerUrl());
      return lib;
    })
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
  return loading;
}

type GestureMap = Pick<
  MapLibre.Map,
  "scrollZoom" | "dragPan" | "touchZoomRotate"
>;

export type MapActivation = {
  dispose: () => void;
};

// The map only takes the wheel and one-finger drags after a click or tap, so
// scrolling the page past it never zooms or pans it by accident. Clicks on the
// map, its buttons and its keyboard handler keep working while it is inactive.
export function clickToActivate(
  map: GestureMap,
  element: HTMLElement,
  options: {
    /** Shown while the mouse rests on the inactive map. */
    hint?: string;
    /** While true, the mouse leaving the map does not release it. */
    holdOnLeave?: () => boolean;
  } = {},
): MapActivation {
  const doc = element.ownerDocument;
  const hint = doc.createElement("div");
  hint.className = "map-activate-hint";
  hint.setAttribute("aria-hidden", "true");
  Object.assign(hint.style, {
    position: "absolute",
    inset: "auto 0 12px",
    margin: "0 auto",
    width: "max-content",
    padding: "4px 10px",
    borderRadius: "4px",
    background: "rgba(20, 30, 35, 0.8)",
    color: "#fff",
    font: "13px/1.4 system-ui, sans-serif",
    pointerEvents: "none",
    zIndex: "3",
    display: "none",
  });
  element.append(hint);
  let active = false;
  let lastPointer = "";
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  const set = (on: boolean) => {
    active = on;
    element.dataset.mapActive = String(on);
    for (const handler of [map.scrollZoom, map.dragPan, map.touchZoomRotate]) {
      if (on) handler.enable();
      else handler.disable();
    }
    if (on) hideHint();
  };
  const hideHint = () => {
    clearTimeout(hideTimer);
    hint.style.display = "none";
  };
  const showHint = (text: string, ms?: number) => {
    if (active) return;
    hint.textContent = text;
    hint.style.display = "block";
    clearTimeout(hideTimer);
    if (ms) hideTimer = setTimeout(hideHint, ms);
  };
  const onPointerDown = (event: PointerEvent) => {
    lastPointer = event.pointerType;
    if (event.pointerType === "mouse") set(true);
  };
  // Capture phase, so a tap activates before MapLibre turns it into a map click.
  const onClick = () => {
    if (lastPointer !== "mouse") set(true);
  };
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && options.hint) showHint(options.hint);
  };
  const release = () => {
    if (!options.holdOnLeave?.()) set(false);
  };
  // A drag that crosses the edge keeps panning; release once the button is up
  // if the mouse is still outside.
  const onDragEnd = (event: Event) => {
    if (!element.contains(event.target as Node)) release();
  };
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    hideHint();
    if (event.buttons) doc.addEventListener("pointerup", onDragEnd, once);
    else release();
  };
  const onOutside = (event: Event) => {
    if (!element.contains(event.target as Node)) set(false);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (!element.contains(event.relatedTarget as Node | null)) set(false);
  };
  const onWheel = () => showHint("Click the map to zoom", 1500);
  const onTouchMove = () => showHint("Tap the map to move it", 1500);
  const capture = { capture: true };
  const once = { once: true };
  element.addEventListener("pointerdown", onPointerDown, capture);
  element.addEventListener("click", onClick, capture);
  element.addEventListener("pointerenter", onPointerEnter);
  element.addEventListener("pointerleave", onPointerLeave);
  element.addEventListener("focusout", onFocusOut);
  element.addEventListener("wheel", onWheel, { passive: true });
  element.addEventListener("touchmove", onTouchMove, { passive: true });
  doc.addEventListener("pointerdown", onOutside, capture);
  set(false);
  return {
    dispose() {
      clearTimeout(hideTimer);
      element.removeEventListener("pointerdown", onPointerDown, capture);
      element.removeEventListener("click", onClick, capture);
      element.removeEventListener("pointerenter", onPointerEnter);
      element.removeEventListener("pointerleave", onPointerLeave);
      element.removeEventListener("focusout", onFocusOut);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchmove", onTouchMove);
      doc.removeEventListener("pointerdown", onOutside, capture);
      doc.removeEventListener("pointerup", onDragEnd);
      hint.remove();
    },
  };
}
