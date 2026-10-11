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
