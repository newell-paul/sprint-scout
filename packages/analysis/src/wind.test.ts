import { describe, expect, it } from "vitest";
import { prepareGeometry, projectWind } from "./index";
const line = (coordinates: number[][]) => ({ type: "LineString", coordinates });
describe("wind-v1 numerical acceptance (1e-8 m/s projection tolerance)", () => {
  it.each([
    [180, 0, 5, 0],
    [0, 0, -5, 0],
    [0, 90, 0, 5],
    [270, 90, 5, 0],
    [180, 180, -5, 0],
  ])("from %s bearing %s", (from, bearing, tail, cross) => {
    const value = projectWind(5, from, bearing);
    expect(value.tailwindMps).toBeCloseTo(tail, 8);
    expect(Math.abs(value.crosswindMps)).toBeCloseTo(cross, 8);
    expect(value.algorithmVersion).toBe("wind-v1");
  });
  it("uses degrees, keeps crosswind sign, handles calm and rejects missing wind", () => {
    expect(projectWind(5, 225, 0).tailwindMps).toBeCloseTo(5 / Math.sqrt(2), 8);
    expect(projectWind(5, 270, 0).crosswindMps).toBeCloseTo(5, 8);
    expect(projectWind(0, null, 0).tailwindMps).toBe(0);
    for (const speed of [null, NaN, -1])
      expect(() => projectWind(speed, 0, 0)).toThrow();
    expect(() => projectWind(5, null, 0)).toThrow();
  });
});
describe("directed geodesic geometry", () => {
  it("deduplicates without mutation, preserves corners and bounds legs", () => {
    const input = line([
      [0, 0],
      [0, 0],
      [0, 0.01],
      [0.01, 0.01],
    ]);
    const copy = structuredClone(input);
    const result = prepareGeometry(input);
    expect(input).toEqual(copy);
    expect(result.lengthM).toBeCloseTo(2223.9016, 2);
    expect(
      result.legs.every((l) => l.distanceM > 0 && l.distanceM <= 100 + 1e-6),
    ).toBe(true);
    expect(
      result.legs.some(
        (l) => Math.abs(l.end[0]) < 1e-9 && Math.abs(l.end[1] - 0.01) < 1e-9,
      ),
    ).toBe(true);
  });
  it("uses longitude first and crosses the dateline by the short arc", () => {
    const east = prepareGeometry(
      line([
        [120, 45],
        [120.001, 45],
      ]),
    );
    expect(east.legs[0]!.bearingDegrees).toBeCloseTo(90, 2);
    expect(
      prepareGeometry(
        line([
          [179.999, 0],
          [-179.999, 0],
        ]),
      ).lengthM,
    ).toBeCloseTo(222.39016, 3);
  });
  it("rejects zero, out-of-range, excessive and invalid geometry", () => {
    for (const coords of [
      [
        [0, 0],
        [0, 0],
      ],
      [
        [0, 91],
        [0, 92],
      ],
      [
        [NaN, 0],
        [0, 1],
      ],
      [
        [0, 0],
        [180, 0],
      ],
      Array.from({ length: 10001 }, () => [0, 0]),
    ])
      expect(() => prepareGeometry(line(coords))).toThrow();
    expect(() => prepareGeometry(null)).toThrow();
    expect(() =>
      prepareGeometry(
        line([
          [0, 0],
          [0, 1],
        ]),
        0,
      ),
    ).toThrow();
  });
});
