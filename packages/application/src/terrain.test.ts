import { describe, expect, it, vi } from "vitest";
import {
  loadTerrain,
  prepareTerrain,
  sampleTerrain,
  validTerrainProfile,
  type TerrainProfile,
} from "./terrain";
import { estimateRouteRideEffect } from "./route-wind";
import { referenceRider } from "@scout/analysis";

const points = [
  [0, 0],
  [0, 0.01],
];
const at = "2026-09-11T08:00:00Z";
const profile = (
  coordinates = points,
  elevations?: number[],
): TerrainProfile => ({
  version: "glo90-profile-v1",
  geometryKey: JSON.stringify(coordinates),
  retrievedAt: at,
  source: "Open-Meteo / Copernicus DEM GLO-90 2021",
  elevationsM:
    elevations ??
    sampleTerrain(coordinates).distancesM.map(
      (distanceM) => 50 + distanceM * 0.05,
    ),
});
describe("independent segment elevation", () => {
  it("samples endpoints and intermediate distances uniformly without claiming finer grid resolution", () => {
    const sampled = sampleTerrain(points);
    expect(sampled.points[0]![0]).toBeCloseTo(0, 8);
    expect(sampled.points[0]![1]).toBeCloseTo(0, 8);
    expect(sampled.points.at(-1)).toEqual(points.at(-1));
    expect(sampled.distancesM[0]).toBe(0);
    expect(sampled.distancesM.at(-1)).toBe(sampled.geometry.lengthM);
    expect(sampled.points.length).toBe(13);
    expect(() =>
      sampleTerrain([
        [0, 0],
        [0, 0.0001],
      ]),
    ).toThrow("90 m");
    expect(() =>
      sampleTerrain([
        [0, 0],
        [0, 1],
      ]),
    ).toThrow("100 km");
  });
  it("preserves linear grades, smooths noise and changes grade sign when reversed", () => {
    const uphill = prepareTerrain(points, profile());
    expect(uphill.maxGradePct).toBeCloseTo(5, 8);
    expect(uphill.ascentM).toBeCloseTo(uphill.geometry.lengthM * 0.05, 8);
    expect(uphill.descentM).toBe(0);
    const reversed = [...points].reverse();
    const downhill = prepareTerrain(
      reversed,
      profile(reversed, [...profile().elevationsM].reverse()),
    );
    expect(downhill.ascentM).toBe(0);
    expect(downhill.descentM).toBeCloseTo(uphill.ascentM, 8);
    expect(downhill.legs.every((leg) => leg.grade < 0)).toBe(true);
    const noisy = profile();
    noisy.elevationsM[6]! += 8;
    const smoothed = prepareTerrain(points, noisy);
    expect(smoothed.smoothedM[6]! - uphill.smoothedM[6]!).toBeCloseTo(4);
  });
  it("rejects missing, mismatched and unrealistic elevation without disabling valid route geometry", () => {
    expect(validTerrainProfile(profile(), [...points].reverse())).toBe(false);
    expect(
      validTerrainProfile({ ...profile(), elevationsM: [10, null] }, points),
    ).toBe(false);
    expect(
      validTerrainProfile({ ...profile(), elevationsM: [10] }, points),
    ).toBe(false);
    expect(
      validTerrainProfile({ ...profile(), version: "unknown" }, points),
    ).toBe(false);
    const steep = profile();
    steep.elevationsM = sampleTerrain(points).distancesM.map(
      (distanceM) => distanceM * 0.5,
    );
    expect(() => prepareTerrain(points, steep)).toThrow("30%");
    const hour = { at, speedMps: 5, fromDegrees: 180 };
    expect(
      estimateRouteRideEffect(points, hour, at, referenceRider, null),
    ).toBeNull();
    expect(
      estimateRouteRideEffect(points, hour, at, referenceRider, steep),
    ).toBeNull();
    expect(
      estimateRouteRideEffect(points, hour, at, referenceRider),
    ).not.toBeNull();
  });
  it("keeps terrain and flat-road estimates distinct and uses a terrain-specific calm baseline", () => {
    const hour = { at, speedMps: 0, fromDegrees: null };
    const terrain = estimateRouteRideEffect(
      points,
      hour,
      at,
      referenceRider,
      profile(),
    )!;
    const flat = estimateRouteRideEffect(points, hour, at, referenceRider)!;
    expect(terrain.version).toBe("terrain-effect-v1");
    expect(flat.version).toBe("ride-effect-v1");
    expect(terrain.windTimeS).toBeGreaterThan(flat.windTimeS);
    expect(terrain.windTimeS).toBe(terrain.calmTimeS);
    expect(terrain.timeRange!.lowS).toBeLessThan(terrain.windTimeS);
    const level = profile(
      points,
      profile().elevationsM.map(() => 100),
    );
    expect(
      estimateRouteRideEffect(points, hour, at, referenceRider, level)!
        .windTimeS,
    ).toBeCloseTo(flat.windTimeS, 9);
    const rolling = profile(
      points,
      profile().elevationsM.map(
        (_, index) => 50 + Math.min(index, 12 - index) * 5,
      ),
    );
    const prepared = prepareTerrain(points, rolling);
    expect(prepared.ascentM).toBeGreaterThan(0);
    expect(prepared.descentM).toBeGreaterThan(0);
    expect(
      estimateRouteRideEffect(points, hour, at, referenceRider, rolling)!
        .windTimeS,
    ).toBeGreaterThan(flat.windTimeS);
  });
  it("requires opt-in and batches at most 100 coordinates without names or credentials", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      const count = url.searchParams.get("latitude")!.split(",").length;
      expect(count).toBeLessThanOrEqual(100);
      expect(url.pathname).toBe("/v1/elevation");
      expect([...url.searchParams.keys()].sort()).toEqual([
        "latitude",
        "longitude",
      ]);
      return new Response(
        JSON.stringify({ elevation: Array(count).fill(100) }),
      );
    });
    const signal = new AbortController().signal;
    await expect(loadTerrain(points, false, signal, fetcher)).rejects.toThrow(
      "Confirm",
    );
    expect(fetcher).not.toHaveBeenCalled();
    const longer = [
      [0, 0],
      [0, 0.12],
    ];
    const result = await loadTerrain(
      longer,
      true,
      signal,
      fetcher,
      new Date(at),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]![1]).toMatchObject({
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
    });
    expect(validTerrainProfile(result, longer)).toBe(true);
    expect(result.retrievedAt).toBe(at.replace("Z", ".000Z"));
  });
  it("rejects partial data, outages, oversized responses and cancelled requests", async () => {
    const signal = new AbortController().signal;
    for (const response of [
      new Response(JSON.stringify({ elevation: [null] })),
      new Response("", { status: 429 }),
      new Response("x".repeat(20001)),
    ]) {
      await expect(
        loadTerrain(
          points,
          true,
          signal,
          vi.fn(async () => response),
        ),
      ).rejects.toThrow();
    }
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      loadTerrain(points, true, controller.signal, fetcher),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
