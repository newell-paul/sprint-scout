"use client";

import ClearData from "./clear-data";
import WindPreview from "./wind-preview";
import Logo from "../components/logo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as RouteMap, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { clickToActivate, loadMapLibre } from "@scout/ui/maplibre";
import {
  newId,
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
import OpportunityBoard from "./opportunity-board";
import RideSource, { type Ride } from "./ride-source";
import {
  nearestOnTrack,
  segmentFromTrack,
  thinTrack,
} from "@scout/analysis/track";
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
};
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
  const [hour, setHour] = useState<RouteWindHour | null>(null);
  const onHour = useCallback((h: RouteWindHour | null) => setHour(h), []);
  const [riderInput, setRiderInput] = useState<RiderInput | null>(null);
  const [daylightDryOnly, setDaylightDryOnly] = useState(false);
  const [request, setRequest] = useState<{ at: string; seq: number } | null>(
    null,
  );
  const rider = useMemo(() => resolveRider(riderInput), [riderInput]);
  // A ride opened to cut a segment from. Never stored; closed on save, cancel
  // and tab switch.
  const [ride, setRide] = useState<Ride | null>(null);
  const [pick, setPick] = useState<{
    start: number | null;
    finish: number | null;
  }>({ start: null, finish: null });
  const [rideHint, setRideHint] = useState("");
  const rideTap = useRef<((p: Point) => void) | null>(null);
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
          instance.addSource("route", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
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
              "line-color": "#a5b4c8",
              "line-width": 4,
              "line-opacity": 0.7,
            },
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
          if (rideTap.current) {
            rideTap.current(p);
            return;
          }
          if (validPoint(p))
            setPoints((old) => (old.length < 500 ? [...old, p] : old));
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
  function pickOnRide(start: number | null, finish: number | null) {
    setPick({ start, finish });
    setRideHint("");
    if (!ride || start === null) return;
    // A lone start shows on the map as the drawing's first point.
    setPoints(
      finish === null
        ? [[ride.track[start]![0], ride.track[start]![1]]]
        : segmentFromTrack(ride.track, start, finish).map((p): Point => [
            p[0],
            p[1],
          ]),
    );
  }
  function closeRide() {
    setRide(null);
    setPick({ start: null, finish: null });
    setRideHint("");
  }
  // The first tap picks the start, the second the finish after it in riding
  // order, so a lap ridden twice is cut as ridden; a third tap starts over.
  rideTap.current = ride
    ? (p) => {
        const finishing = pick.start !== null && pick.finish === null;
        const hit = nearestOnTrack(
          ride.track,
          p,
          finishing ? pick.start! + 1 : 0,
        );
        if (hit.index === -1 || hit.distanceM > 200) {
          setRideHint("Tap on the ride's line.");
          return;
        }
        if (finishing) pickOnRide(pick.start, hit.index);
        else pickOnRide(hit.index, null);
      }
    : null;
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const source = instance.getSource("ride") as GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: ride
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: thinTrack(ride.track, 2000),
              },
            },
          ]
        : [],
    });
    if (!ride) return;
    const lon = ride.track.map((p) => p[0]),
      lat = ride.track.map((p) => p[1]);
    instance.fitBounds(
      [
        [Math.min(...lon), Math.min(...lat)],
        [Math.max(...lon), Math.max(...lat)],
      ],
      { padding: 40, maxZoom: 16, duration: 0 },
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
      "route-outline",
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
  // Shelter and target compare the whole stored segment; the rest compare only
  // its geometry, because terrain and efforts arrive after async work during
  // which another setting may be saved.
  function updateRoute(
    route: DrawnRoute,
    patch: Partial<DrawnRoute>,
    compare: "whole" | "points" = "points",
    changed = "Segment changed in another tab.",
  ) {
    const key = (r: DrawnRoute) =>
      JSON.stringify(compare === "whole" ? r : r.points);
    return persist((current) => {
      const stored = current.find((item) => item.id === route.id);
      if (!stored || key(stored) !== key(route)) throw new Error(changed);
      return current.map((item) =>
        item.id === route.id ? { ...item, ...patch } : item,
      );
    });
  }
  const saveReason =
    points.length < 2
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
      terrain:
        JSON.stringify(editing?.points) === JSON.stringify(points)
          ? (editing?.terrain ?? null)
          : null,
      terrainMode: editing?.terrainMode ?? "flat",
      terrainAuto: editing?.terrainAuto ?? false,
      shelter: editing?.shelter ?? "exposed",
      efforts:
        JSON.stringify(editing?.points) === JSON.stringify(points)
          ? (editing?.efforts ?? [])
          : [],
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
      closeRide();
      setPoints([]);
      setName(null);
      setConfirmed(false);
      setEditing(null);
      setDiscarded(null);
    }
  }
  function redraw(r: DrawnRoute) {
    setEditing(r);
    setPoints(r.points.map((p) => [...p]));
    setName(r.name);
    setConfirmed(false);
    setMessage(
      `Editing ${r.name}. Your saved version stays unchanged until Save.`,
    );
  }
  // Cancel, Escape and picking another tab all end a drawing the same way.
  function discard(nextSlot = returnSlot ?? slot) {
    if (hasDraft) {
      setDiscarded({ slot, points, name, confirmed, editing });
      setMessage("Drawing discarded. Saved segments are unchanged.");
    }
    setEditing(null);
    closeRide();
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
              ? rideHint ||
                (pick.start === null
                  ? "Tap the start of your segment on the ride."
                  : pick.finish === null
                    ? "Now tap the finish on the ride."
                    : "Segment cut from your ride. Tap to pick a new start, or save below.")
              : points.length === 0
                ? "Tap the map to place your start."
                : points.length < 2
                  ? "Now tap the finish. Lines go straight between points."
                  : "Tap to add bends, then save below."}
          </p>
          <span className="drawing-actions">
            <button
              type="button"
              aria-label="Undo point"
              disabled={!points.length}
              onClick={() => setPoints((p) => p.slice(0, -1))}
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
          onShelterChange={(shelter) =>
            updateRoute(selectedRoute, { shelter }, "whole")
          }
          onTerrainChange={(terrain, terrainMode) =>
            updateRoute(
              selectedRoute,
              { terrain, terrainMode },
              "points",
              "Segment changed while loading terrain.",
            )
          }
          onEffortsChange={(efforts) => updateRoute(selectedRoute, { efforts })}
          onTerrainAutoChange={(terrainAuto) =>
            updateRoute(selectedRoute, { terrainAuto })
          }
          onTargetChange={(targetTimeS) =>
            updateRoute(selectedRoute, { targetTimeS }, "whole")
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
        <RideSource
          ride={ride}
          start={pick.start}
          finish={pick.finish}
          onOpen={(opened) => {
            setRide(opened);
            setPick({ start: null, finish: null });
            setRideHint("");
          }}
          onPick={pickOnRide}
          onClose={closeRide}
        />
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
                if (points.length < 500) setPoints((old) => [...old, p]);
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
            Open-Meteo only when you enable it. Loading terrain separately
            shares sampled coordinates along the segment and saves attributed
            elevation in this browser. Removing elevation or deleting the
            segment removes that local profile; provider request logs may remain
            for 90 days. A ride opened to make a segment is read in this
            browser, and only the segment you save is kept. Strava access is
            disabled. Clearing saved data, here or in the browser, deletes
            everything the planner stored.
          </p>
          <ClearData />
        </details>
      </footer>
    </main>
  );
}
