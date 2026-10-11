import { describe, expect, it } from "vitest";
import { estimateRouteRideEffect } from "./route-wind";
import { referenceRider } from "@scout/analysis";
import { isShelter, shelterPresets, type Shelter } from "./shelter";
import { sampleTerrain, type TerrainProfile } from "./terrain";

const points = [
  [0, 0],
  [0, 0.01],
];
const hour = { at: "2026-09-11T08:00:00Z", speedMps: 5, fromDegrees: 180 };
const terrain: TerrainProfile = {
  version: "glo90-profile-v1",
  geometryKey: JSON.stringify(points),
  retrievedAt: hour.at,
  source: "Open-Meteo / Copernicus DEM GLO-90 2021",
  elevationsM: sampleTerrain(points).distancesM.map(
    (distanceM) => 50 + distanceM * 0.04,
  ),
};
describe("manual shelter scenarios", () => {
  it("validates named presets and keeps the default exposed model", () => {
    expect(isShelter("dense")).toBe(true);
    expect(isShelter("unknown")).toBe(false);
    expect(shelterPresets.dense.windFactor).toBe(0.35);
    expect(estimateRouteRideEffect(points, hour)).toEqual(
      estimateRouteRideEffect(
        points,
        hour,
        undefined,
        referenceRider,
        undefined,
        "exposed",
      ),
    );
    expect(
      estimateRouteRideEffect(
        points,
        hour,
        undefined,
        referenceRider,
        undefined,
        "invalid" as Shelter,
      ),
    ).toBeNull();
  });
  it("reduces tailwind benefit and headwind penalty on flat and graded segments", () => {
    for (const profile of [undefined, terrain]) {
      for (const fromDegrees of [0, 180]) {
        const estimates = (["exposed", "sheltered", "dense"] as const).map(
          (shelter) =>
            estimateRouteRideEffect(
              points,
              { ...hour, fromDegrees },
              hour.at,
              referenceRider,
              profile,
              shelter,
            )!,
        );
        const [exposed, sheltered, dense] = estimates;
        expect(dense!.calmTimeS).toBeCloseTo(exposed!.calmTimeS, 10);
        expect(Math.abs(dense!.timeDeltaS)).toBeLessThan(
          Math.abs(sheltered!.timeDeltaS),
        );
        expect(Math.abs(sheltered!.timeDeltaS)).toBeLessThan(
          Math.abs(exposed!.timeDeltaS),
        );
        expect(dense!.exposedTimeS).toBe(exposed!.windTimeS);
        expect(dense!.timeRange!.lowS).toBeLessThanOrEqual(
          exposed!.timeRange!.lowS,
        );
        expect(dense!.timeRange!.highS).toBeGreaterThanOrEqual(
          exposed!.timeRange!.highS,
        );
        expect(dense!.timeRange!.lowS).toBeLessThanOrEqual(dense!.windTimeS);
        expect(dense!.timeRange!.highS).toBeGreaterThanOrEqual(
          dense!.windTimeS,
        );
      }
    }
  });
  it("does not invent wind or terrain and leaves calm time unchanged", () => {
    expect(
      estimateRouteRideEffect(
        points,
        { ...hour, speedMps: null },
        hour.at,
        referenceRider,
        undefined,
        "dense",
      ),
    ).toBeNull();
    expect(
      estimateRouteRideEffect(
        points,
        hour,
        hour.at,
        referenceRider,
        null,
        "dense",
      ),
    ).toBeNull();
    const calm = estimateRouteRideEffect(
      points,
      { ...hour, speedMps: 0, fromDegrees: null },
      hour.at,
      referenceRider,
      terrain,
      "dense",
    )!;
    expect(calm.windTimeS).toBe(calm.calmTimeS);
  });
  it("does not mutate forecast readings, geometry or rider inputs", () => {
    const before = JSON.stringify({ hour, points, terrain, referenceRider });
    estimateRouteRideEffect(
      points,
      hour,
      hour.at,
      referenceRider,
      terrain,
      "dense",
    );
    expect(JSON.stringify({ hour, points, terrain, referenceRider })).toBe(
      before,
    );
  });
});
