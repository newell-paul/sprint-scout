import type { Point } from "./library";

type Geometry =
  | { type: "LineString"; coordinates: Point[] }
  | { type: "Point"; coordinates: Point };
type RouteFeature = {
  type: "Feature";
  properties: Record<string, never>;
  geometry: Geometry;
};

const feature = (geometry: Geometry): RouteFeature => ({
  type: "Feature",
  properties: {},
  geometry,
});

// A saved segment shows dots only at its ends; while drawing, every click
// keeps its dot. Direction arrows are placed by the map along the line.
export function routeFeatures(points: Point[], saved: boolean) {
  const dots =
    saved && points.length > 1
      ? [points[0]!, points[points.length - 1]!]
      : points;
  return {
    type: "FeatureCollection" as const,
    features: [
      ...(points.length > 1
        ? [feature({ type: "LineString", coordinates: points })]
        : []),
      ...dots.map((p) => feature({ type: "Point", coordinates: p })),
    ],
  };
}
