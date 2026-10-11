import { describe, expect, it, vi } from "vitest";
import { defaultPlannerRequest, type Segment } from "@scout/contracts";
import { demoSegments, syntheticProvenance } from "@scout/providers";
import { sampleWeatherPoints } from "./forecast";
import { getDemoConditions, getPlannerData } from "./planner";
import { loadRouteWind, parseRouteWind, routeCrosswind } from "./route-wind";
import { prepareTerrain, sampleTerrain, validTerrainProfile } from "./terrain";
import { analyzeCandidates } from "./wind";
import { requirePermission, withPermittedSources } from "./policy";
import { estimateDeparture } from "./departure";
import { isShelter } from "./shelter";
import { resolveLocalInstant } from "./time";

const now = new Date("2026-09-07T12:00:00Z");
const window = {
  startAt: "2026-09-08T16:00:00Z",
  endAt: "2026-09-08T18:00:00Z",
  timeZone: "Europe/London",
};
const first = demoSegments[0]!;
const openMeteoSource = {
  ...syntheticProvenance,
  sourceKind: "open-meteo" as const,
  sourceId: "open-meteo-demo-v1",
  expiresAt: "2027-01-01T00:00:00Z",
  policy: { ...syntheticProvenance.policy, decisionId: "open-meteo-demo-v1" },
};

describe("weather sampling limits", () => {
  it("rejects more than 50 segments and duplicate ids", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({
      ...first,
      id: `s${i}`,
    }));
    expect(() => sampleWeatherPoints(many, now)).toThrow(
      "At most 50 distinct segments",
    );
    expect(() => sampleWeatherPoints([first, first], now)).toThrow(
      "At most 50 distinct segments",
    );
  });
  it("records permission, source-kind and geometry failures per segment", () => {
    const denied: Segment = {
      ...first,
      id: "a-denied",
      provenance: {
        ...first.provenance,
        policy: { ...first.provenance.policy, derivedOutputs: false },
      },
    };
    const external: Segment = {
      ...first,
      id: "b-external",
      provenance: openMeteoSource,
    };
    const broken = {
      ...first,
      id: "c-broken",
      geometry: { type: "LineString", coordinates: [[0, 0]] },
    } as unknown as Segment;
    const result = sampleWeatherPoints([denied, external, broken], now);
    expect(result.routes).toEqual([]);
    expect(result.points).toEqual([]);
    expect(result.errors.map((e) => [e.segmentId, e.code])).toEqual([
      ["a-denied", "SOURCE_NOT_PERMITTED"],
      ["b-external", "SOURCE_NOT_PERMITTED"],
      ["c-broken", "GEOMETRY_INVALID"],
    ]);
  });
});

describe("planner guards", () => {
  it("refuses unknown, external and denied segments before any weather call", async () => {
    const provider = { getForecast: vi.fn() };
    await expect(
      getDemoConditions(
        { ...window, segmentIds: ["nope"], limit: 2 },
        { provider },
      ),
    ).rejects.toThrow("Source is not permitted");
    await expect(
      getDemoConditions(
        { ...window, segmentIds: [first.id], limit: 2 },
        { provider, segments: [{ ...first, provenance: openMeteoSource }] },
      ),
    ).rejects.toThrow("Source is not permitted");
    const denied = {
      ...first,
      provenance: {
        ...first.provenance,
        policy: { ...first.provenance.policy, analysis: false },
      },
    };
    await expect(
      getDemoConditions(
        { ...window, segmentIds: [first.id], limit: 2 },
        { provider, segments: [denied] },
      ),
    ).rejects.toThrow("Source is not permitted");
    expect(provider.getForecast).not.toHaveBeenCalled();
  });
  it("passes fold choices through to the resolved window", async () => {
    const result = await getPlannerData({
      ...defaultPlannerRequest,
      date: "2026-10-25",
      startTime: "01:30",
      endTime: "03:00",
      startChoice: "later",
      endChoice: "earlier",
    });
    expect(result.window).toEqual({
      startAt: "2026-10-25T01:30:00Z",
      endAt: "2026-10-25T03:00:00Z",
    });
  });
});

describe("independent route guards", () => {
  it("rejects a non-object forecast body and a body with no usable wind", async () => {
    expect(() => parseRouteWind(null, 0)).toThrow("Invalid weather response.");
    expect(() => parseRouteWind("x", 0)).toThrow("Invalid weather response.");
    const start = Date.parse("2026-09-11T12:00:00Z");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        utc_offset_seconds: 0,
        hourly_units: {
          time: "unixtime",
          wind_speed_10m: "m/s",
          wind_direction_10m: "°",
        },
        hourly: {
          time: [start / 1000],
          wind_speed_10m: [null],
          wind_direction_10m: [null],
        },
      }),
    );
    await expect(
      loadRouteWind(
        { point: [0, 51], independentConfirmed: true, weatherConsent: true },
        new AbortController().signal,
        fetcher,
        new Date(start),
      ),
    ).rejects.toThrow("No usable wind forecast returned.");
    expect(
      routeCrosswind(
        [
          [0, 51],
          [0, 52],
        ],
        { speedMps: null, fromDegrees: null },
      ),
    ).toBeNull();
  });
  it("treats elevation for unusable geometry as invalid and refuses to prepare it", () => {
    const points = [
      [0, 51],
      [0, 51.01],
    ];
    const profile = {
      version: "glo90-profile-v1" as const,
      geometryKey: JSON.stringify([[0, 51]]),
      retrievedAt: now.toISOString(),
      source: "Open-Meteo / Copernicus DEM GLO-90 2021" as const,
      elevationsM: [1, 2],
    };
    expect(validTerrainProfile(profile, [[0, 51]])).toBe(false);
    expect(() => prepareTerrain(points, profile)).toThrow("Reload terrain.");
  });
  it("cuts geometry legs at elevation samples that fall inside them", () => {
    const points = [
      [0, 51],
      [0, 51.00135],
      [0.0017, 51.00135],
    ];
    const sampling = sampleTerrain(points);
    const terrain = prepareTerrain(points, {
      version: "glo90-profile-v1",
      geometryKey: JSON.stringify(points),
      retrievedAt: now.toISOString(),
      source: "Open-Meteo / Copernicus DEM GLO-90 2021",
      elevationsM: sampling.points.map(() => 100),
    });
    expect(terrain.legs.length).toBeGreaterThan(sampling.geometry.legs.length);
    expect(terrain.distanceM).toBeCloseTo(sampling.geometry.lengthM, 3);
    expect(terrain.maxGradePct).toBe(0);
  });
});

describe("analysis use case guards", () => {
  it("records empty spatial coverage as unavailable", () => {
    const result = analyzeCandidates(
      [
        {
          segmentId: "empty",
          source: syntheticProvenance,
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [0, 0.01],
            ],
          },
          slots: [
            {
              attemptAt: window.startAt,
              weather: { scope: "legs", hours: [] },
            },
          ],
        },
      ],
      window,
      now,
    );
    expect(result.errors.map((e) => e.code)).toEqual(["FORECAST_UNAVAILABLE"]);
  });
  it("refuses malformed provenance, invalid clocks and empty source lists", () => {
    expect(() =>
      requirePermission({ sourceKind: "synthetic" }, "analysis", now),
    ).toThrow("Source is not permitted");
    expect(() =>
      requirePermission(syntheticProvenance, "analysis", new Date(Number.NaN)),
    ).toThrow("Source is not permitted");
    expect(() => withPermittedSources([], "analysis", now, () => 1)).toThrow(
      "Source is not permitted",
    );
    expect(
      withPermittedSources([syntheticProvenance], "analysis", now, () => 1),
    ).toBe(1);
  });
  it("validates departure inputs and shelter names", () => {
    expect(() => estimateDeparture("2026-09-08T16:00", 10, 10)).toThrow();
    expect(() => estimateDeparture(window.startAt, 10.5, 10)).toThrow(
      "whole minutes",
    );
    expect(() => estimateDeparture(window.startAt, 0, 121)).toThrow(
      "whole minutes",
    );
    expect(estimateDeparture(window.startAt, 360, 120).departureAt).toBe(
      "2026-09-08T08:00:00Z",
    );
    expect(isShelter("dense")).toBe(true);
    expect(isShelter("windy")).toBe(false);
    expect(isShelter(undefined)).toBe(false);
  });
  it("rejects malformed local inputs with INVALID_LOCAL_TIME", () => {
    for (const [date, time, zone, choice] of [
      ["2026-9-8", "16:00", "Europe/London", undefined],
      ["2026-09-08", "4pm", "Europe/London", undefined],
      ["2026-09-08", "16:00", "+01:00", undefined],
      ["2026-09-08", "16:00", "Europe/London", "middle"],
      ["2026-02-30", "16:00", "Europe/London", undefined],
    ] as const)
      expect(() =>
        resolveLocalInstant(date, time, zone, choice as never),
      ).toThrow("INVALID_LOCAL_TIME");
  });
});
