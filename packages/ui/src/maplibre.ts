import type * as MapLibre from "maplibre-gl";

// MapLibre 6 finds its worker from import.meta.url, which bundlers rewrite to
// a non-http value, so the worker silently fails and GeoJSON layers never
// paint. Next serves the worker and its shared chunk from public/maplibre
// (copied at build time); a self-contained host
// supplies its own URL, typically a blob, through configureMapLibre.
let workerUrl: string | undefined;
let loaded: typeof MapLibre | undefined;
let loading: Promise<typeof MapLibre> | undefined;
const defaultWorkerUrl = () => {
  const base =
    typeof process === "undefined"
      ? ""
      : (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  return `${base}/maplibre/maplibre-gl-worker.mjs`;
};
export function configureMapLibre(options: { workerUrl: string }) {
  workerUrl = options.workerUrl;
  loaded?.setWorkerUrl(workerUrl);
}
export function loadMapLibre(): Promise<typeof MapLibre> {
  // A failed import is not cached, so a retry can succeed once the network does.
  loading ??= import("maplibre-gl")
    .then((lib) => {
      lib.setWorkerUrl(workerUrl ?? defaultWorkerUrl());
      loaded = lib;
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

// The map only takes the wheel and one-finger drags after a click or tap, so
// scrolling the page past it never zooms or pans it by accident. Clicks on the
// map, its buttons and its keyboard handler keep working while it is inactive.
export function clickToActivate(map: GestureMap, element: HTMLElement) {
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
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  const set = (on: boolean) => {
    active = on;
    element.dataset.mapActive = String(on);
    for (const handler of [map.scrollZoom, map.dragPan, map.touchZoomRotate]) {
      if (on) handler.enable();
      else handler.disable();
    }
    if (on) hint.style.display = "none";
  };
  const showHint = (text: string) => {
    if (active) return;
    hint.textContent = text;
    hint.style.display = "block";
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => (hint.style.display = "none"), 1500);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") set(true);
  };
  const onClick = () => set(true);
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === "mouse") set(false);
  };
  const onOutside = (event: Event) => {
    if (!element.contains(event.target as Node)) set(false);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (!element.contains(event.relatedTarget as Node | null)) set(false);
  };
  const onWheel = () => showHint("Click the map to zoom");
  const onTouchMove = () => showHint("Tap the map to move it");
  const capture = { capture: true };
  element.addEventListener("pointerdown", onPointerDown, capture);
  element.addEventListener("click", onClick);
  element.addEventListener("pointerleave", onPointerLeave);
  element.addEventListener("focusout", onFocusOut);
  element.addEventListener("wheel", onWheel, { passive: true });
  element.addEventListener("touchmove", onTouchMove, { passive: true });
  doc.addEventListener("pointerdown", onOutside, capture);
  set(false);
  return () => {
    clearTimeout(hideTimer);
    element.removeEventListener("pointerdown", onPointerDown, capture);
    element.removeEventListener("click", onClick);
    element.removeEventListener("pointerleave", onPointerLeave);
    element.removeEventListener("focusout", onFocusOut);
    element.removeEventListener("wheel", onWheel);
    element.removeEventListener("touchmove", onTouchMove);
    doc.removeEventListener("pointerdown", onOutside, capture);
    hint.remove();
  };
}
