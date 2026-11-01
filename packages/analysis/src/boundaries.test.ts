import { describe, expect, it } from "vitest";
import { prepareGeometry, projectWind } from "./index";
import {
  estimateRideEffect,
  referenceRider,
  solveSpeedMps,
} from "./ride-effect";

// Exact-boundary tests. Each pair sits one step either side of a limit so a
// mutated comparison operator or dropped condition fails here.
const line = (coordinates: number[][]) => ({ type: "LineString", coordinates });
const north = line([
  [0, 51],
  [0, 51.0009],
]);

describe("geometry limits", () => {
  it.each([1, 100])("accepts a sampling distance of %s m", (maxLegM) => {
    expect(prepareGeometry(north, maxLegM).legs.length).toBeGreaterThan(0);
  });
  it.each([0.999, 100.001])(
    "rejects a sampling distance of %s m",
    (maxLegM) => {
      expect(() => prepareGeometry(north, maxLegM)).toThrow(
        "Expected a bounded directed LineString and sampling distance from 1 to 100 m",
      );
    },
  );
  it("accepts 2000 sampled legs and rejects 2001", () => {
    expect(
      prepareGeometry(
        line([
          [0, 0],
          [0, 1.7986],
        ]),
      ).legs,
    ).toHaveLength(2000);
    expect(() =>
      prepareGeometry(
        line([
          [0, 0],
          [0, 1.7988],
        ]),
      ),
    ).toThrow("Sampled geometry exceeds 2000 legs");
  });
  it("ignores repeated and sub-micron points without changing the legs", () => {
    const clean = prepareGeometry(north);
    const noisy = prepareGeometry(
      line([
        [0, 51],
        [0, 51],
        [1e-13, 51],
        [0, 51.0009],
      ]),
    );
    expect(noisy.legs.length).toBe(clean.legs.length);
    expect(noisy.lengthM).toBeCloseTo(clean.lengthM, 6);
    expect(() =>
      prepareGeometry(
        line([
          [0, 51],
          [0, 51],
        ]),
      ),
    ).toThrow("Geometry has no nonzero legs");
  });
  it("samples so that no leg exceeds the requested distance", () => {
    const legs = prepareGeometry(
      line([
        [0, 51],
        [0, 51.0027],
      ]),
      100,
    ).legs;
    expect(legs).toHaveLength(4);
    expect(Math.max(...legs.map((l) => l.distanceM))).toBeLessThanOrEqual(100);
  });
});

describe("wind input limits", () => {
  it("accepts a direction just under 360 and rejects 360, negatives and NaN", () => {
    expect(projectWind(5, 359.999, 0).tailwindMps).toBeCloseTo(-5, 3);
    for (const from of [360, -0.001, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => projectWind(5, from, 0)).toThrow(
        "Valid wind speed and direction are required unless calm",
      );
    expect(() => projectWind(5, 0, Number.NaN)).toThrow();
  });
});

describe("rider physics limits", () => {
  it("clamps wind to ±30 m/s in both directions", () => {
    expect(solveSpeedMps(-100)).toBe(solveSpeedMps(-30));
    expect(solveSpeedMps(-29.999)).toBeGreaterThan(solveSpeedMps(-30));
  });
  it("ignores unusable legs and refuses a route with none", () => {
    const only = estimateRideEffect([{ distanceM: 1000, tailwindMps: 3 }]);
    const padded = estimateRideEffect([
      { distanceM: 0, tailwindMps: -20 },
      { distanceM: Number.NaN, tailwindMps: -20 },
      { distanceM: 1000, tailwindMps: Number.NaN },
      { distanceM: 1000, tailwindMps: 3 },
    ]);
    expect(padded.timeDeltaS).toBe(only.timeDeltaS);
    expect(() =>
      estimateRideEffect([{ distanceM: 0, tailwindMps: 1 }]),
    ).toThrow("Ride effect needs legs");
    expect(
      estimateRideEffect([{ distanceM: 1000, tailwindMps: 3 }], undefined, {
        leadHours: Number.NaN,
      }).band,
    ).toBeNull();
    const negative = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 3 }],
      undefined,
      { leadHours: -1 },
    );
    const positive = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 3 }],
      undefined,
      { leadHours: 1 },
    );
    expect(negative.band).toBeNull();
    expect(positive.band?.leadHours).toBe(1);
  });
  it("copies the rider into the result", () => {
    const rider = { ...referenceRider };
    const result = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 0 }],
      rider,
    );
    expect(result.rider).toEqual(rider);
    expect(result.rider).not.toBe(rider);
  });
});
