import { describe, expect, it } from "vitest";
import type { Point } from "./library";
import { routeFeatures } from "./route-features";

const track: Point[] = [
  [-0.45, 51.38],
  [-0.46, 51.381],
  [-0.47, 51.382],
  [-0.48, 51.383],
];
const dots = (points: Point[], saved: boolean) =>
  routeFeatures(points, saved)
    .features.filter((f) => f.geometry.type === "Point")
    .map((f) => f.geometry.coordinates);
const lines = (points: Point[], saved: boolean) =>
  routeFeatures(points, saved).features.filter(
    (f) => f.geometry.type === "LineString",
  );

describe("route features", () => {
  it("keeps a dot on every point while drawing", () => {
    expect(dots(track, false)).toEqual(track);
    expect(lines(track, false)).toHaveLength(1);
  });

  it("shows only the start and finish dots on a saved segment", () => {
    expect(dots(track, true)).toEqual([track[0], track[3]]);
    expect(lines(track, true)[0]?.geometry.coordinates).toEqual(track);
  });

  it("draws no line for a single point", () => {
    expect(dots(track.slice(0, 1), false)).toEqual([track[0]]);
    expect(lines(track.slice(0, 1), false)).toHaveLength(0);
  });

  it("draws nothing for no points", () => {
    expect(routeFeatures([], true).features).toEqual([]);
  });
});
