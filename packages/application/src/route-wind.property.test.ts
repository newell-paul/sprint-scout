import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  describeRouteWind,
  estimateRouteRideEffect,
  routeCrosswind,
} from "./route-wind";
import { sampleTerrain, type TerrainProfile } from "./terrain";
import { shelterPresets, type Shelter } from "./shelter";

const runs = { numRuns: 60, seed: Number(process.env.FC_SEED ?? 20260913) };
const offset = fc
  .tuple(fc.double({ min: 0.002, max: 0.05, noNaN: true }), fc.boolean())
  .map(([size, negative]) => (negative ? -size : size));
const straight = fc
  .tuple(offset, offset)
  .map(([dx, dy]): [number, number][] => [
    [-1.5, 52],
    [-1.5 + dx, 52 + dy],
  ]);
const hour = fc.record({
  at: fc.constant("2026-09-10T10:00:00Z"),
  speedMps: fc.double({ min: 0.5, max: 25, noNaN: true }),
  fromDegrees: fc.double({ min: 0, max: 359.9, noNaN: true }),
});
const retrievedAt = "2026-09-10T06:00:00Z";
const between = (value: number, a: number, b: number) =>
  value >= Math.min(a, b) - 1e-6 && value <= Math.max(a, b) + 1e-6;
const descriptions = new Set([
  "Wind unavailable",
  "Calm",
  "Mixed headwind and tailwind",
  "Mostly crosswind",
  "Tailwind",
  "Headwind",
  "Light wind effect",
  "Route wind unavailable",
]);

describe("route ride effect invariants", () => {
  it("moves the time toward calm as shelter increases on a straight segment", () => {
    fc.assert(
      fc.property(straight, hour, (points, h) => {
        const times = (["exposed", "sheltered", "dense"] as Shelter[]).map(
          (shelter) =>
            estimateRouteRideEffect(
              points,
              h,
              retrievedAt,
              undefined,
              undefined,
              shelter,
            )!,
        );
        const [exposed, sheltered, dense] = times as [
          NonNullable<(typeof times)[0]>,
          NonNullable<(typeof times)[0]>,
          NonNullable<(typeof times)[0]>,
        ];
        return (
          between(sheltered.windTimeS, exposed.calmTimeS, exposed.windTimeS) &&
          between(dense.windTimeS, exposed.calmTimeS, sheltered.windTimeS) &&
          Math.abs(exposed.exposedTimeS! - exposed.windTimeS) < 1e-6
        );
      }),
      runs,
    );
  });
  it("keeps the wind time inside the estimated range", () => {
    fc.assert(
      fc.property(
        straight,
        hour,
        fc.constantFrom(...(Object.keys(shelterPresets) as Shelter[])),
        (points, h, shelter) => {
          const effect = estimateRouteRideEffect(
            points,
            h,
            retrievedAt,
            undefined,
            undefined,
            shelter,
          );
          return (
            effect !== null &&
            effect.timeRange !== null &&
            effect.timeRange.lowS <= effect.windTimeS + 1e-6 &&
            effect.windTimeS <= effect.timeRange.highS + 1e-6
          );
        },
      ),
      runs,
    );
  });
  it("matches the flat estimate when terrain is level", () => {
    fc.assert(
      fc.property(straight, hour, (points, h) => {
        const terrain: TerrainProfile = {
          version: "glo90-profile-v1",
          geometryKey: JSON.stringify(points),
          source: "Open-Meteo / Copernicus DEM GLO-90 2021",
          retrievedAt,
          elevationsM: sampleTerrain(points).points.map(() => 120),
        };
        const flat = estimateRouteRideEffect(points, h, retrievedAt)!;
        const level = estimateRouteRideEffect(
          points,
          h,
          retrievedAt,
          undefined,
          terrain,
        )!;
        return (
          Math.abs(flat.windTimeS - level.windTimeS) < 1e-3 &&
          Math.abs(flat.calmTimeS - level.calmTimeS) < 1e-3
        );
      }),
      runs,
    );
  });
  it("bounds the mean crosswind by the wind speed", () => {
    fc.assert(
      fc.property(straight, hour, (points, h) => {
        const cross = routeCrosswind(points, h);
        return cross !== null && cross >= 0 && cross <= h.speedMps + 1e-9;
      }),
      runs,
    );
  });
  it("always describes the wind with a known phrase", () => {
    fc.assert(
      fc.property(straight, hour, (points, h) =>
        descriptions.has(describeRouteWind(points, h)),
      ),
      runs,
    );
    expect(describeRouteWind([[0, 0]], { speedMps: 3, fromDegrees: 90 })).toBe(
      "Route wind unavailable",
    );
    expect(
      routeCrosswind([[0, 0]], { speedMps: 3, fromDegrees: 90 }),
    ).toBeNull();
    expect(
      estimateRouteRideEffect([[0, 0]], {
        at: retrievedAt,
        speedMps: 3,
        fromDegrees: 90,
      }),
    ).toBeNull();
    expect(
      estimateRouteRideEffect(
        [
          [0, 51],
          [0.01, 51],
        ],
        { at: retrievedAt, speedMps: 3, fromDegrees: 90 },
        undefined,
        undefined,
        undefined,
        "windy" as never,
      ),
    ).toBeNull();
  });
});
