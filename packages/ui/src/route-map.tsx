"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import type { PlannerHour } from "@scout/contracts";
import { clickToActivate, loadMapLibre } from "./maplibre";
function arrow(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 40;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas unavailable");
  c.strokeStyle = "#ffffff";
  c.lineWidth = 8;
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const width of [8, 4]) {
    c.lineWidth = width;
    c.strokeStyle = width === 8 ? "#ffffff" : color;
    c.beginPath();
    c.moveTo(20, 33);
    c.lineTo(20, 7);
    c.moveTo(10, 17);
    c.lineTo(20, 7);
    c.lineTo(30, 17);
    c.stroke();
  }
  return c.getImageData(0, 0, 40, 40);
}
export default function RouteMap({ row }: { row: PlannerHour }) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<LibreMap | null>(null),
    lastSegment = useRef("");
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    let instance: LibreMap | undefined;
    let observer: ResizeObserver | undefined;
    let release: (() => void) | undefined;
    const onContextLost = () => {
      if (!disposed) setFailed(true);
    };
    const element = container.current;
    if (!element) return;
    loadMapLibre()
      .then(({ Map, NavigationControl, ScaleControl }) => {
        if (disposed) return;
        try {
          instance = new Map({
            container: element,
            style: {
              version: 8,
              sources: {},
              layers: [
                {
                  id: "background",
                  type: "background",
                  paint: { "background-color": "#e2ece8" },
                },
              ],
            },
            center: [0.005, 51.005],
            zoom: 14,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false,
            renderWorldCopies: false,
          });
          map.current = instance;
          release = clickToActivate(instance, element);
          observer = new ResizeObserver(() => instance?.resize());
          observer.observe(element);
          instance.addControl(
            new NavigationControl({ showCompass: false }),
            "top-right",
          );
          instance.addControl(new ScaleControl({ unit: "metric" }));
          instance
            .getCanvas()
            .setAttribute(
              "aria-label",
              "Synthetic route map. Use arrow keys to pan and plus or minus to zoom.",
            );
          instance.on("error", () => {
            if (!disposed) setFailed(true);
          });
          instance
            .getCanvas()
            .addEventListener("webglcontextlost", onContextLost);
          instance.on("load", () => {
            if (disposed || !instance) return;
            instance.addImage("wind-arrow", arrow("#163d5c"));
            instance.addImage("ride-arrow", arrow("#754300"));
            instance.addSource("legs", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            instance.addSource("arrows", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            instance.addLayer({
              id: "outline",
              type: "line",
              source: "legs",
              paint: { "line-color": "#ffffff", "line-width": 12 },
            });
            instance.addLayer({
              id: "route",
              type: "line",
              source: "legs",
              paint: {
                "line-color": [
                  "case",
                  [">", ["get", "tail"], 0.5],
                  "#00796d",
                  ["<", ["get", "tail"], -0.5],
                  "#a85d00",
                  "#566b72",
                ],
                "line-width": 6,
              },
            });
            instance.addLayer({
              id: "headwind-dashes",
              type: "line",
              source: "legs",
              filter: ["<", ["get", "tail"], -0.5],
              paint: {
                "line-color": "#ffffff",
                "line-width": 2,
                "line-dasharray": [1, 3],
              },
            });
            instance.addLayer({
              id: "flow",
              type: "symbol",
              source: "arrows",
              layout: {
                "icon-image": ["get", "icon"],
                "icon-size": 0.65,
                "icon-rotate": ["get", "bearing"],
                "icon-rotation-alignment": "map",
                "icon-allow-overlap": true,
              },
            });
            setReady(true);
          });
        } catch {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      release?.();
      instance
        ?.getCanvas()
        .removeEventListener("webglcontextlost", onContextLost);
      instance?.remove();
      map.current = null;
    };
  }, [retry]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const features = row.legs.map((l) => ({
      type: "Feature" as const,
      properties: { tail: l.tailwindMps },
      geometry: { type: "LineString" as const, coordinates: [l.start, l.end] },
    }));
    (m.getSource("legs") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    });
    const arrows = row.legs.flatMap((l, i) =>
      i % 4 !== 0
        ? []
        : [
            {
              type: "Feature" as const,
              properties: { bearing: l.bearingDegrees, icon: "ride-arrow" },
              geometry: { type: "Point" as const, coordinates: l.start },
            },
            ...(l.windBearingDegrees === null
              ? []
              : [
                  {
                    type: "Feature" as const,
                    properties: {
                      bearing: l.windBearingDegrees,
                      icon: "wind-arrow",
                    },
                    geometry: {
                      type: "Point" as const,
                      coordinates: [l.start[0] + 0.001, l.start[1]],
                    },
                  },
                ]),
          ],
    );
    (m.getSource("arrows") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: arrows,
    });
    if (lastSegment.current !== row.segmentId) {
      lastSegment.current = row.segmentId;
      const points = row.legs.flatMap((l) => [l.start, l.end]);
      m.fitBounds(
        [
          [
            Math.min(...points.map((p) => p[0])) - 0.002,
            Math.min(...points.map((p) => p[1])),
          ],
          [
            Math.max(...points.map((p) => p[0])) + 0.002,
            Math.max(...points.map((p) => p[1])),
          ],
        ],
        { padding: 64, duration: 0, maxZoom: 15 },
      );
    }
  }, [row, ready]);
  return (
    <div
      className="map-shell"
      data-testid="route-map"
      data-attempt={row.attemptAt}
      data-segment={row.segmentId}
      data-map-ready={ready && !failed ? "true" : "false"}
    >
      <div
        ref={container}
        className="map-canvas"
        style={{ visibility: failed ? "hidden" : "visible" }}
      />
      {failed ? (
        <div className="map-message" role="status">
          <strong>Map unavailable</strong>
          <p>
            The hourly and route-section tables still contain all measurements.
          </p>
          <button
            onClick={() => {
              setReady(false);
              setFailed(false);
              lastSegment.current = "";
              setRetry((n) => n + 1);
            }}
          >
            Retry map
          </button>
        </div>
      ) : !ready ? (
        <div className="map-message skeleton" role="status">
          Loading directed map…
        </div>
      ) : null}
      <div className="map-caption">
        N ↑ · Synthetic geometry · No road tiles
      </div>
    </div>
  );
}
