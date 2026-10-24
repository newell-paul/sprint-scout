import { describe, expect, it } from "vitest";
import { prepareGeometry, projectWind } from "./index";
import {
  estimateRideEffect,
  referenceRider,
  solveSpeedMps,
} from "./ride-effect";
import { estimateTerrainEffect, solveTerrainSpeedMps } from "./terrain-effect";

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
    const terrain = estimateTerrainEffect(
      [{ distanceM: 1000, tailwindMps: 0, grade: 0 }],
      rider,
    );
    expect(terrain.rider).toEqual(rider);
    expect(terrain.rider).not.toBe(rider);
  });
});

describe("terrain physics limits", () => {
  it.each([
    ["mass", { massKg: 0 }],
    ["drag area", { cdaM2: 0 }],
    ["air density", { airDensity: 0 }],
    ["rolling resistance", { crr: -0.001 }],
    ["non-finite mass", { massKg: Number.NaN }],
  ])("rejects a rider with invalid %s", (_, patch) => {
    expect(() =>
      solveTerrainSpeedMps(300, 0, 0, { ...referenceRider, ...patch }),
    ).toThrow("Terrain model inputs are outside supported limits.");
  });
  it("accepts grade and wind exactly at the limits and rejects just beyond", () => {
    expect(solveTerrainSpeedMps(300, 30, 0.3)).toBeGreaterThan(0);
    expect(
      solveTerrainSpeedMps(300, -30, -0.3, { ...referenceRider, massKg: 40 }),
    ).toBeGreaterThan(0);
    expect(() => solveTerrainSpeedMps(300, 30.001, 0)).toThrow();
    expect(() => solveTerrainSpeedMps(300, 0, -0.3001)).toThrow();
    expect(() => solveTerrainSpeedMps(1000, 30, -0.3)).toThrow(
      "Terrain speed exceeds the model limit of 144 km/h.",
    );
  });
  it("is slower uphill than on the flat and faster with the grade component removed", () => {
    const flat = solveTerrainSpeedMps(300, 0, 0);
    expect(solveTerrainSpeedMps(300, 0, 0.05)).toBeLessThan(flat);
    expect(solveTerrainSpeedMps(300, 0, -0.05)).toBeGreaterThan(flat);
    expect(solveTerrainSpeedMps(300, 0, 0)).toBeCloseTo(
      solveSpeedMps(0, { ...referenceRider, calmSpeedKmh: flat * 3.6 }),
      6,
    );
  });
  it.each([
    ["no legs", []],
    ["zero distance", [{ distanceM: 0, tailwindMps: 0, grade: 0 }]],
    [
      "non-finite wind",
      [{ distanceM: 100, tailwindMps: Number.NaN, grade: 0 }],
    ],
    [
      "non-finite crosswind",
      [{ distanceM: 100, tailwindMps: 0, crosswindMps: Number.NaN, grade: 0 }],
    ],
    ["grade over 30%", [{ distanceM: 100, tailwindMps: 0, grade: 0.31 }]],
  ])("rejects terrain legs with %s", (_, legs) => {
    expect(() => estimateTerrainEffect(legs)).toThrow(
      "Complete valid terrain legs are required.",
    );
  });
  it("projects the along-route wind onto the slope", () => {
    const steep = estimateTerrainEffect([
      { distanceM: 1000, tailwindMps: 8, grade: 0.3 },
    ]);
    const flat = estimateTerrainEffect([
      { distanceM: 1000, tailwindMps: 8, grade: 0 },
    ]);
    expect(steep.windSpeedMps).toBeLessThan(flat.windSpeedMps);
    expect(steep.calmSpeedMps).toBeLessThan(flat.calmSpeedMps);
    expect(
      estimateTerrainEffect(
        [{ distanceM: 1000, tailwindMps: 8, grade: 0 }],
        referenceRider,
        Number.NaN,
      ).band,
    ).toBeNull();
    const band = estimateTerrainEffect(
      [{ distanceM: 1000, tailwindMps: 8, grade: 0.02 }],
      referenceRider,
      6,
    ).band!;
    expect(band.leadHours).toBe(6);
    expect(band.speedDeltaHighMps).toBeGreaterThan(band.speedDeltaLowMps);
  });
});
