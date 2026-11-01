"use client";

import ClearData from "./clear-data";
import WindPreview from "./wind-preview";
import Logo from "../components/logo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as RouteMap, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { clickToActivate, loadMapLibre } from "@scout/ui/maplibre";
import { gpxLimits, parseGpx } from "@scout/application/gpx";
import { nearestTrackIndex, trackStretch } from "@scout/analysis/track-stretch";
import {
  newId,
  nextFreeSlot,
  readLibrary,
  storageKey,
  validPoint,
  type DrawnRoute,
  type Point,
} from "./library";
import SegmentSlots from "./segment-slots";
import { seedExampleOnFirstVisit } from "./example-segment";
import WeatherIcon from "../components/weather-icon";
import type { RouteWindHour } from "@scout/application/route-wind";
import type { RiderInput } from "@scout/analysis";
import type { SpeedUnit } from "../components/speed";
import VersionBadge from "./version-badge";
import OpportunityBoard from "./opportunity-board";
import {
  readRiderInput,
  resolveRider,
  riderStorageKey,
  riderStorageValue,
} from "./rider";

function bearingDegrees(a: Point, b: Point) {
  const toRad = Math.PI / 180;
  const dLon = (b[0] - a[0]) * toRad;
  const y = Math.sin(dLon) * Math.cos(b[1] * toRad);
  const x =
    Math.cos(a[1] * toRad) * Math.sin(b[1] * toRad) -
    Math.sin(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
// White chevron pointing north with a dark halo; rotated by leg bearing.
function directionArrow() {
  const size = 40;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas unavailable");
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const [color, width] of [
    ["#0b0f19", 10],
    ["#ffffff", 5],
  ] as const) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(8, 26);
    c.lineTo(20, 10);
    c.lineTo(32, 26);
    c.stroke();
  }
  return c.getImageData(0, 0, size, size);
}
// A drawing put aside by Cancel, Escape or a tab switch, kept so Restore can
// bring it back in this session.
type Draft = {
  slot: number;
  points: Point[];
  name: string | null;
  confirmed: boolean;
  editing: DrawnRoute | null;
  cut: Cut | null;
};
// A GPX ride read in this browser, kept in memory only until it is cut.
type RideFile = {
  fileName: string;
  trackName: string | null;
  track: Point[];
  /** Recorded height of each track point, null where the file has none. */
  heights: (number | null)[];
};
// Heights belong to the exact points they were cut with; any edit drops them.
type Cut = { points: Point[]; heightsM: number[] };
const sameCut = (cut: Cut | null, points: Point[]) =>
  cut !== null && JSON.stringify(cut.points) === JSON.stringify(points);
// MapLibre's 512 px tiles: metres per screen pixel at zoom 0 on the equator.
const metresPerPixelAtZoom0 = 78_271.517;
const fileBase = (fileName: string) => fileName.replace(/\.gpx$/i, "");
export default function Routes() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<RouteMap | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const drawing = useRef(false);
  // null shows the default "Segment N" until the rider types.
  const [name, setName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [routes, setRoutes] = useState<DrawnRoute[]>([]);
  const [message, setMessage] = useState("");
  const [mapError, setMapError] = useState("");
  const [latitude, setLatitude] = useState("51.5");
  const [longitude, setLongitude] = useState("-0.12");
  const [ready, setReady] = useState(false);
  const [slot, setSlot] = useState(0);
  const [unit, setUnit] = useState<SpeedUnit>("km/h");
  const [editing, setEditing] = useState<DrawnRoute | null>(null);
  const [deleted, setDeleted] = useState<DrawnRoute | null>(null);
  const [discarded, setDiscarded] = useState<Draft | null>(null);
  const [cameFrom, setCameFrom] = useState<number | null>(null);
  // A single ride being picked on, and pre-cut files waiting for the next save.
  const [ride, setRide] = useState<
    (RideFile & { start: number | null }) | null
  >(null);
  const [queue, setQueue] = useState<RideFile[]>([]);
  const [cut, setCut] = useState<Cut | null>(null);
  const addPointRef = useRef<(p: Point) => void>(() => {});
  const [hour, setHour] = useState<RouteWindHour | null>(null);
  const onHour = useCallback((h: RouteWindHour | null) => setHour(h), []);
  const [riderInput, setRiderInput] = useState<RiderInput | null>(null);
  const [daylightDryOnly, setDaylightDryOnly] = useState(false);
  const [request, setRequest] = useState<{ at: string; seq: number } | null>(
    null,
  );
  const rider = useMemo(() => resolveRider(riderInput), [riderInput]);
  useEffect(() => {
    try {
      setRiderInput(readRiderInput(localStorage.getItem(riderStorageKey)));
    } catch {
      /* Reference rider applies. */
    }
  }, []);
  const changeRider = useCallback((input: RiderInput | null) => {
    setRiderInput(input);
    try {
      if (input)
        localStorage.setItem(
          riderStorageKey,
          riderStorageValue(localStorage.getItem(riderStorageKey), input),
        );
      else localStorage.removeItem(riderStorageKey);
      return true;
    } catch {
      /* Keep the in-memory rider for this session. */
      return false;
    }
  }, []);
  const openOpportunity = useCallback((nextSlot: number, at: string) => {
    setRequest((previous) => ({ at, seq: (previous?.seq ?? 0) + 1 }));
    setSlot(nextSlot);
  }, []);
  const selectedRoute = editing
    ? undefined
    : routes.find((r) => r.slot === slot);
  const hasDraft =
    !!editing || points.length > 0 || name !== null || ride !== null;
  const segmentName = name ?? `Segment ${slot + 1}`;
  // Cancel goes back to the saved segment being redrawn, else the segment the
  // rider came from, else the first saved one.
  const returnSlot = editing
    ? editing.slot
    : cameFrom !== null && routes.some((r) => r.slot === cameFrom)
      ? cameFrom
      : routes.map((r) => r.slot).sort((a, b) => a - b)[0];
  const canCancel =
    hasDraft || (returnSlot !== undefined && returnSlot !== slot);
  const viewing = useRef(false);
  viewing.current = !!selectedRoute;
  const visiblePoints = selectedRoute?.points ?? points;
  useEffect(() => {
    const refresh = () => {
      try {
        const saved = readLibrary(localStorage.getItem(storageKey));
        setRoutes(saved);
      } catch {
        setMessage("Cannot read saved routes. Existing data is preserved.");
      }
    };
    try {
      seedExampleOnFirstVisit(localStorage, {
        id: newId(),
        createdAt: new Date().toISOString(),
      });
    } catch {
      /* Storage unavailable: nothing to seed. */
    }
    refresh();
    try {
      const first = readLibrary(localStorage.getItem(storageKey))
        .map((r) => r.slot)
        .sort((a, b) => a - b)[0];
      if (first !== undefined) setSlot(first);
    } catch {
      /* Preserve unreadable storage. */
    }
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  useEffect(() => {
    let cancelled = false;
    let instance: RouteMap | undefined;
    let release: (() => void) | undefined;
    void loadMapLibre()
      .then(({ Map, NavigationControl }) => {
        if (cancelled || !container.current) return;
        instance = new Map({
          container: container.current,
          center: [-0.12, 51.5],
          zoom: 13,
          dragRotate: false,
          pitchWithRotate: false,
          fadeDuration: 0,
          style: {
            version: 8,
            sources: {},
            layers: [
              {
                id: "background",
                type: "background",
                paint: { "background-color": "#1e2a3a" },
              },
            ],
          },
        });
        map.current = instance;
        const activation = clickToActivate(instance, container.current, {
          hint: "Click to use the map",
          holdOnLeave: () => drawing.current,
        });
        release = activation.dispose;
        instance.addControl(new NavigationControl({ showCompass: false }));
        instance.touchZoomRotate.disableRotation();
        instance.keyboard.disableRotation();
        instance.on("load", () => {
          if (!instance) return;
          instance.addSource("ride", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          instance.addLayer({
            id: "ride-line",
            type: "line",
            source: "ride",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#e2e8f0",
              "line-width": 3,
              "line-opacity": 0.7,
              "line-dasharray": [2, 1.5],
            },
          });
          instance.addSource("route", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          instance.addLayer({
            id: "route-outline",
            type: "line",
            source: "route",
            filter: ["==", "$type", "LineString"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#f97316",
              "line-width": 22,
              "line-blur": 10,
              "line-opacity": 0.75,
            },
          });
          instance.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            filter: ["==", "$type", "LineString"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#f97316", "line-width": 5 },
          });
          instance.addImage("route-arrow", directionArrow());
          instance.addLayer({
            id: "route-arrows",
            type: "symbol",
            source: "route",
            filter: ["==", ["get", "kind"], "arrow"],
            layout: {
              "icon-image": "route-arrow",
              "icon-size": 0.7,
              "icon-rotate": ["get", "bearing"],
              "icon-rotation-alignment": "map",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          });
          instance.addLayer({
            id: "route-points",
            type: "circle",
            source: "route",
            filter: [
              "all",
              ["==", ["geometry-type"], "Point"],
              ["!=", ["get", "kind"], "arrow"],
            ],
            paint: {
              "circle-color": "#f97316",
              "circle-radius": 6,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
            },
          });
          setReady(true);
        });
        instance.on("click", (e) => {
          if (viewing.current) return;
          const p: Point = [e.lngLat.wrap().lng, e.lngLat.lat];
          if (validPoint(p)) addPointRef.current(p);
        });
        instance.on("error", () =>
          setMapError(
            "Street map unavailable. Your segment and wind can still be shown.",
          ),
        );
      })
      .catch(() => setMapError("Map unavailable. Enter coordinates instead."));
    return () => {
      cancelled = true;
      release?.();
      instance?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    drawing.current = points.length > 0 || ride !== null;
  }, [points, ride]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const track = ride?.track ?? [];
    (m.getSource("ride") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: track.length
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: track },
            },
          ]
        : [],
    });
    if (!track.length || ride?.start !== null) return;
    const lon = track.map((p) => p[0]),
      lat = track.map((p) => p[1]);
    m.fitBounds(
      [
        [Math.min(...lon), Math.min(...lat)],
        [Math.max(...lon), Math.max(...lat)],
      ],
      { padding: 60, maxZoom: 16, duration: 0 },
    );
  }, [ride, ready]);
  useEffect(() => {
    if (!ready) return;
    const source = map.current?.getSource("route") as GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: [
        ...(visiblePoints.length > 1
          ? [
              {
                type: "Feature" as const,
                properties: {},
                geometry: {
                  type: "LineString" as const,
                  coordinates: visiblePoints,
                },
              },
            ]
          : []),
        ...visiblePoints.slice(1).map((p, i) => {
          const a = visiblePoints[i]!;
          return {
            type: "Feature" as const,
            properties: { kind: "arrow", bearing: bearingDegrees(a, p) },
            geometry: {
              type: "Point" as const,
              coordinates: [(a[0] + p[0]) / 2, (a[1] + p[1]) / 2],
            },
          };
        }),
        ...visiblePoints.map((p) => ({
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Point" as const, coordinates: p },
        })),
      ],
    });
  }, [visiblePoints, ready]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || m.getSource("streets")) return;
    m.addSource("streets", {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    });
    m.addLayer(
      {
        id: "streets",
        type: "raster",
        source: "streets",
        // Inverted and hue-turned so streets read light on dark; the
        // navy background shows through the slight transparency.
        paint: {
          "raster-brightness-min": 0.82,
          "raster-brightness-max": 0.08,
          "raster-hue-rotate": 180,
          "raster-saturation": -0.55,
          "raster-contrast": 0.1,
          "raster-opacity": 0.82,
        },
      },
      "ride-line",
    );
    m.setPaintProperty("background", "background-color", "#1e2a3a");
  }, [ready]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    // The OpenStreetMap attribution guidelines let the credit shrink to its (i)
    // five seconds after it appears; MapLibre itself only shrinks it on a drag.
    const shrink = window.setTimeout(
      () =>
        m
          .getContainer()
          .querySelector(".maplibregl-compact-show")
          ?.classList.remove("maplibregl-compact-show"),
      5_000,
    );
    return () => window.clearTimeout(shrink);
  }, [ready]);
  useEffect(() => {
    if (!ready || !selectedRoute || !map.current) return;
    const lon = selectedRoute.points.map((p) => p[0]),
      lat = selectedRoute.points.map((p) => p[1]);
    const instance = map.current;
    const fit = () =>
      instance.fitBounds(
        [
          [Math.min(...lon), Math.min(...lat)],
          [Math.max(...lon), Math.max(...lat)],
        ],
        // Clear of the wind badge (top left), the zoom buttons (top right)
        // and the Start and Finish labels that sit above their points.
        {
          padding: { top: 80, right: 100, bottom: 40, left: 60 },
          maxZoom: 16,
          duration: 0,
        },
      );
    fit();
    instance.on("resize", fit);
    return () => {
      instance.off("resize", fit);
    };
  }, [selectedRoute, ready]);
  useEffect(() => {
    if (!ready || !map.current || !visiblePoints.length) return;
    const instance = map.current;
    let cancelled = false;
    const markers: import("maplibre-gl").Marker[] = [];
    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled) return;
      const ends = [
        { point: visiblePoints[0]!, label: "Start", anchor: "bottom" as const },
      ];
      if (visiblePoints.length > 1)
        ends.push({
          point: visiblePoints[visiblePoints.length - 1]!,
          label: "Finish",
          anchor: "bottom",
        });
      for (const end of ends) {
        const element = document.createElement("span");
        element.className = "route-end-label";
        element.textContent = end.label;
        markers.push(
          new Marker({ element, anchor: end.anchor, offset: [0, -10] })
            .setLngLat(end.point)
            .addTo(instance),
        );
      }
    });
    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
    };
  }, [visiblePoints, ready]);
  function persist(next: (current: DrawnRoute[]) => DrawnRoute[]) {
    try {
      const updated = next(readLibrary(localStorage.getItem(storageKey)));
      const raw = JSON.stringify(updated);
      readLibrary(raw);
      localStorage.setItem(storageKey, raw);
      setRoutes(updated);
      return true;
    } catch {
      setMessage(
        "Could not save changes. Storage may be full, unavailable, or invalid; existing routes are preserved.",
      );
      return false;
    }
  }
  function updateRoute(route: DrawnRoute, patch: Partial<DrawnRoute>) {
    return persist((current) => {
      const stored = current.find((item) => item.id === route.id);
      if (!stored || JSON.stringify(stored) !== JSON.stringify(route))
        throw new Error("Segment changed in another tab.");
      return current.map((item) =>
        item.id === route.id ? { ...item, ...patch } : item,
      );
    });
  }
  // A tap counts within 24 screen pixels of the ride, never less than 25 m.
  function pickToleranceM(at: Point) {
    const m = map.current;
    if (!m) return 50;
    const metresPerPixel =
      (metresPerPixelAtZoom0 * Math.cos((at[1] * Math.PI) / 180)) /
      2 ** m.getZoom();
    return Math.max(25, 24 * metresPerPixel);
  }
  function addPoint(p: Point) {
    if (!ride) {
      setPoints((old) => (old.length < 500 ? [...old, p] : old));
      return;
    }
    const toleranceM = pickToleranceM(p);
    if (ride.start === null) {
      const start = nearestTrackIndex(ride.track, p, toleranceM);
      if (start === null) {
        setMessage("Tap on the ride's line.");
        return;
      }
      setRide({ ...ride, start });
      setPoints([ride.track[start]!]);
      setMessage("");
      return;
    }
    const finish = nearestTrackIndex(ride.track, p, toleranceM, ride.start);
    try {
      if (finish === null) throw new Error("No finish after the start.");
      applyStretch(ride, trackStretch(ride.track, ride.start, finish));
    } catch {
      setMessage(
        "The ride doesn't pass there after your start. Tap further along it, in the direction you rode.",
      );
    }
  }
  addPointRef.current = addPoint;
  function applyStretch(
    file: RideFile,
    stretch: ReturnType<typeof trackStretch>,
    waiting = 0,
  ) {
    const heights = stretch.indices.map((i) => file.heights[i] ?? null);
    setCut(
      heights.every((h) => h !== null)
        ? {
            points: stretch.points,
            heightsM: heights.map((h) => Math.round(h * 10) / 10),
          }
        : null,
    );
    setRide(null);
    setPoints(stretch.points);
    setMessage(
      `${(stretch.lengthM / 1000).toFixed(2)} km taken from ${file.fileName}, ${stretch.points.length} points. The file was read in this browser only.${stretch.thinned ? " Thinned to 500 points." : ""}${waiting ? ` ${waiting} more ${waiting === 1 ? "file" : "files"} after this one.` : ""}`,
    );
  }
  // A pre-cut file is the segment: its whole track, named after the track.
  function takeWholeTrack(file: RideFile, waiting = 0) {
    applyStretch(
      file,
      trackStretch(file.track, 0, file.track.length - 1),
      waiting,
    );
    setName((file.trackName ?? fileBase(file.fileName)).slice(0, 100));
  }
  async function importRides(files: File[]) {
    const read: RideFile[] = [];
    const refused: string[] = [];
    for (const file of files) {
      try {
        if (file.size > gpxLimits.bytes)
          throw new Error("GPX file is missing or larger than 25 MB.");
        const parsed = parseGpx(await file.text());
        const kept = parsed.points.filter((p) => validPoint([p.lon, p.lat]));
        const track = kept.map((p): Point => [p.lon, p.lat]);
        // Throws when the track never moves, so a bad file is refused here.
        trackStretch(track, 0, track.length - 1);
        read.push({
          fileName: file.name,
          trackName: parsed.name,
          track,
          heights: kept.map((p) => p.ele),
        });
      } catch (error) {
        refused.push(
          `${file.name}: ${error instanceof Error ? error.message : "Could not read this file."}`,
        );
      }
    }
    const refusedNote = refused.length
      ? ` Not added: ${refused.join(" ")}`
      : "";
    const [first, ...rest] = read;
    if (!first) {
      setMessage(refused.join(" "));
      return;
    }
    if (files.length === 1) {
      setRide({ ...first, start: null });
      setMessage(
        `Ride loaded from ${first.fileName}. Tap where your segment starts, or use the whole track.`,
      );
      return;
    }
    takeWholeTrack(first, rest.length);
    setQueue(rest);
    if (refusedNote) setMessage((m) => m + refusedNote);
  }
  const saveReason = ride
    ? ride.start === null
      ? "Tap the ride where your segment starts, or press Use whole track above the map."
      : "Tap the ride where your segment finishes."
    : points.length < 2
      ? "Add at least two different points to save your segment."
      : !points.some((p) => p[0] !== points[0]?.[0] || p[1] !== points[0]?.[1])
        ? "Add a point at a different location to save your segment."
        : !segmentName.trim()
          ? "Enter a segment name to save your segment."
          : !confirmed
            ? "Tick the independent-source confirmation above to enable Save segment."
            : "Ready to save in this browser.";
  const canSave = saveReason === "Ready to save in this browser.";
  function save() {
    if (!canSave) return;
    const route: DrawnRoute = {
      id: editing?.id ?? newId(),
      name: segmentName.trim(),
      points: points.map((p) => [...p]),
      confirmed: true,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      slot,
      targetTimeS: editing?.targetTimeS ?? null,
      shelter: editing?.shelter ?? "exposed",
      ...(cut && sameCut(cut, points) && { heightsM: [...cut.heightsM] }),
    };
    if (
      persist((current) => {
        const existing = current.find((item) => item.slot === slot);
        if (JSON.stringify(existing ?? null) !== JSON.stringify(editing))
          throw new Error("Segment changed in another tab.");
        return [...current.filter((r) => r.slot !== slot), route];
      })
    ) {
      setMessage("Segment saved on this browser.");
      setPoints([]);
      setName(null);
      setConfirmed(false);
      setEditing(null);
      setDiscarded(null);
      setCut(null);
      const [next, ...rest] = queue;
      if (next) {
        setSlot(nextFreeSlot(readLibrary(localStorage.getItem(storageKey))));
        setQueue(rest);
        takeWholeTrack(next, rest.length);
      }
    }
  }
  function redraw(r: DrawnRoute) {
    setEditing(r);
    setPoints(r.points.map((p) => [...p]));
    setCut(r.heightsM ? { points: r.points, heightsM: r.heightsM } : null);
    setName(r.name);
    setConfirmed(false);
    setMessage(
      `Editing ${r.name}. Your saved version stays unchanged until Save.`,
    );
  }
  // Cancel, Escape and picking another tab all end a drawing the same way.
  function discard(nextSlot = returnSlot ?? slot) {
    // A ride not yet cut cannot be restored: the file is not kept.
    if (ride)
      setMessage("Ride import cancelled. Saved segments are unchanged.");
    else if (hasDraft) {
      setDiscarded({ slot, points, name, confirmed, editing, cut });
      setMessage(
        queue.length
          ? `Drawing discarded. ${queue.length} more ${queue.length === 1 ? "file was" : "files were"} not added.`
          : "Drawing discarded. Saved segments are unchanged.",
      );
    }
    setRide(null);
    setQueue([]);
    setCut(null);
    setEditing(null);
    setPoints([]);
    setName(null);
    setConfirmed(false);
    setRequest(null);
    setSlot(nextSlot);
  }
  function restore() {
    if (!discarded || hasDraft) return;
    if (!discarded.editing && routes.some((r) => r.slot === discarded.slot)) {
      setDiscarded(null);
      setMessage("That slot now holds a saved segment.");
      return;
    }
    setSlot(discarded.slot);
    setPoints(discarded.points);
    setName(discarded.name);
    setConfirmed(discarded.confirmed);
    setEditing(discarded.editing);
    setCut(discarded.cut);
    setDiscarded(null);
    setMessage("Drawing restored.");
  }
  // A board hour belongs to the segment opened from the board.
  function pickSlot(nextSlot: number) {
    if (nextSlot === slot) return;
    setCameFrom(slot);
    if (hasDraft) discard(nextSlot);
    else {
      setRequest(null);
      setSlot(nextSlot);
    }
  }
  useEffect(() => {
    if (selectedRoute) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && canCancel)
        discard();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  function remove(r: DrawnRoute) {
    if (persist((current) => current.filter((item) => item.id !== r.id))) {
      setDeleted(r);
      setMessage("Saved segment deleted.");
    }
  }
  function undoDelete() {
    if (!deleted) return;
    if (
      persist((current) => {
        if (
          current.some(
            (item) => item.slot === deleted.slot || item.id === deleted.id,
          )
        )
          throw new Error("Slot is already occupied.");
        return [...current, deleted];
      })
    ) {
      setSlot(deleted.slot);
      setDeleted(null);
      setMessage("Segment restored.");
    }
  }
  return (
    <main className="segment-screen">
      <header className="segment-toolbar">
        <h1>
          <Logo className="segment-logo" />
        </h1>
        <div className="unit-control" role="group" aria-label="Speed units">
          <span>Speed units</span>
          <span className="unit-switch">
            {(["km/h", "mph"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={unit === option}
                onClick={() => setUnit(option)}
              >
                {option}
              </button>
            ))}
          </span>
        </div>
        <SegmentSlots routes={routes} active={slot} onSelect={pickSlot} />
      </header>
      {selectedRoute ? (
        <div className="drawing-hint segment-heading">
          <strong>
            {selectedRoute.name}
            {hour && <WeatherIcon code={hour.weatherCode} isDay={hour.isDay} />}
          </strong>
          <details className="segment-menu">
            <summary>Manage</summary>
            <div>
              <button type="button" onClick={() => redraw(selectedRoute)}>
                Redraw segment
              </button>{" "}
              <button type="button" onClick={() => remove(selectedRoute)}>
                Delete segment
              </button>
            </div>
          </details>
        </div>
      ) : (
        <div className="drawing-bar">
          <p aria-live="polite">
            {ride
              ? points.length === 0
                ? "Tap the ride where your segment starts."
                : "Now tap where it finishes, further along the ride."
              : points.length === 0
                ? "Tap the map to place your start."
                : points.length < 2
                  ? "Now tap the finish. Lines go straight between points."
                  : "Tap to add bends, then save below."}
          </p>
          <span className="drawing-actions">
            {ride ? (
              <button type="button" onClick={() => takeWholeTrack(ride)}>
                Use whole track
              </button>
            ) : (
              <label className="drawing-import">
                <span className="button-like" aria-disabled={points.length > 0}>
                  From GPX
                </span>
                <input
                  type="file"
                  accept=".gpx,application/gpx+xml"
                  multiple
                  disabled={points.length > 0}
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    event.target.value = "";
                    if (files.length) void importRides(files);
                  }}
                />
              </label>
            )}
            <button
              type="button"
              aria-label="Undo point"
              disabled={!points.length}
              onClick={() => {
                if (ride) setRide({ ...ride, start: null });
                setPoints((p) => p.slice(0, -1));
              }}
            >
              Undo
            </button>
            {canCancel && (
              <button
                type="button"
                aria-label="Cancel drawing"
                onClick={() => discard()}
              >
                Cancel
              </button>
            )}
          </span>
        </div>
      )}
      {discarded && !hasDraft && (
        <div className="delete-notice discard-notice">
          <span>Drawing discarded.</span>
          <button type="button" aria-label="Restore drawing" onClick={restore}>
            Restore
          </button>
          <button type="button" onClick={() => setDiscarded(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div
        ref={container}
        role="region"
        aria-label="Route drawing map"
        className="segment-map"
      />
      {mapError && <small>{mapError}</small>}
      {selectedRoute && (
        <WindPreview
          key={JSON.stringify([selectedRoute.id, selectedRoute.points])}
          route={selectedRoute}
          map={map.current}
          ready={ready}
          onHour={onHour}
          unit={unit}
          rider={rider}
          riderInput={riderInput}
          onRiderChange={changeRider}
          daylightDryOnly={daylightDryOnly}
          onDaylightDryChange={setDaylightDryOnly}
          requestedAt={request?.at ?? null}
          requestSeq={request?.seq ?? 0}
          onShelterChange={(shelter) => updateRoute(selectedRoute, { shelter })}
          onTargetChange={(targetTimeS) =>
            updateRoute(selectedRoute, { targetTimeS })
          }
        />
      )}
      {selectedRoute && (
        <OpportunityBoard
          routes={routes}
          rider={rider}
          daylightDryOnly={daylightDryOnly}
          activeSlot={slot}
          onOpen={openOpportunity}
        />
      )}
      <div className="segment-editor" hidden={!!selectedRoute}>
        <p>
          {points.length} / 500 points · Ride from Start to Finish along the
          arrows.
        </p>
        <p>
          <label>
            Segment name{" "}
            <input
              maxLength={100}
              value={segmentName}
              onFocus={(e) => {
                if (name === null) e.target.select();
              }}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </p>
        <p>
          <label className="source-confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I created this route independently of Strava or other restricted
            data, permit local storage and deterministic route analysis, and
            agree that its start coordinate is sent to Open-Meteo for wind
            forecasts.
          </label>
        </p>
        <button
          className="primary"
          disabled={!canSave}
          aria-describedby="save-reason"
          onClick={save}
        >
          Save segment
        </button>
        <p id="save-reason" aria-live="polite">
          {saveReason}
        </p>
        <details className="coordinate-tools">
          <summary>Enter coordinates instead</summary>
          <fieldset>
            <legend className="sr-only">Coordinates / keyboard drawing</legend>
            <label>
              Latitude{" "}
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </label>{" "}
            <label>
              Longitude{" "}
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </label>{" "}
            <button
              onClick={() => {
                const p: Point = [Number(longitude), Number(latitude)];
                if (!longitude.trim() || !latitude.trim() || !validPoint(p)) {
                  setMessage(
                    "Enter longitude −180 to 180 and latitude −85 to 85.",
                  );
                  return;
                }
                map.current?.flyTo({ center: p });
                addPoint(p);
              }}
            >
              Add point and centre map
            </button>
          </fieldset>
        </details>
        <details>
          <summary>Ordered route points</summary>
          <button
            disabled={points.length < 2}
            onClick={() => setPoints((p) => [...p].reverse())}
          >
            Reverse direction
          </button>
          <ol>
            {points.map((p, i) => (
              <li key={i}>
                {p[1].toFixed(5)}, {p[0].toFixed(5)}
                {i === 0
                  ? " — start"
                  : i === points.length - 1
                    ? " — finish"
                    : ""}
              </li>
            ))}
          </ol>
        </details>
      </div>
      <p role="status">{message}</p>
      {deleted && (
        <div className="delete-notice">
          <span>Deleted {deleted.name}.</span>
          <button type="button" disabled={hasDraft} onClick={undoDelete}>
            Undo delete
          </button>
          <button type="button" onClick={() => setDeleted(null)}>
            Dismiss
          </button>
        </div>
      )}
      <footer className="segment-footer">
        <a href="https://www.openstreetmap.org/copyright">
          © OpenStreetMap contributors
        </a>
        <span aria-hidden="true">·</span>
        <details>
          <summary>Data & privacy</summary>
          <p>
            Saved segments stay in this browser. Street maps share the viewed
            area with OpenStreetMap. Weather shares the segment start with
            Open-Meteo only when you enable it; provider request logs may remain
            for 90 days. Strava access is disabled. Clearing saved data, here or
            in the browser, deletes everything the planner stored.
          </p>
          <ClearData />
        </details>
        <VersionBadge />
      </footer>
    </main>
  );
}
