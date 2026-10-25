import { describe, expect, it } from "vitest";
import { referenceRider } from "@scout/analysis";
import type { RouteWindForecast } from "@scout/application/route-wind";
import {
  nextExpiry,
  rankOpportunities,
  type ForecastState,
} from "./opportunities";
import type { DrawnRoute } from "./library";
import { sampleTerrain, type TerrainProfile } from "@scout/application/terrain";
import { estimateRouteRideEffect } from "@scout/application/route-wind";
const route = (id: string, name: string, points: DrawnRoute["points"]) =>
  ({
    id,
    name,
    points,
    confirmed: true,
    createdAt: "2026-09-10T00:00:00Z",
    slot: 0,
  }) satisfies DrawnRoute;
const forecast = (
  point: [number, number],
  speeds: (number | null)[],
  from = 180,
  isDay: boolean[] = [],
): RouteWindForecast => ({
  point,
  retrievedAt: "2026-09-10T08:00:00Z",
  expiresAt: Date.now() + 60_000,
  hours: speeds.map((speedMps, i) => ({
    at: new Date(Date.UTC(2026, 8, 10, 9 + i)).toISOString(),
    speedMps,
    fromDegrees: speedMps ? from : null,
    flowDegrees: speedMps ? (from + 180) % 360 : null,
    weatherCode: 0,
    isDay: isDay[i] ?? true,
  })),
});
describe("opportunity board ranking", () => {
  it("uses the same terrain estimate as the cockpit and refuses missing terrain", () => {
    const points: DrawnRoute["points"] = [
      [0, 0],
      [0, 0.01],
    ];
    const terrain: TerrainProfile = {
      version: "glo90-profile-v1",
      geometryKey: JSON.stringify(points),
      source: "Open-Meteo / Copernicus DEM GLO-90 2021",
      retrievedAt: "2026-09-10T00:00:00Z",
      elevationsM: sampleTerrain(points).distancesM.map(
        (distanceM) => 50 + distanceM * 0.05,
      ),
    };
    const segment = {
      ...route("hill", "Hill", points),
      terrainMode: "terrain" as const,
      terrain,
    };
    const weather = forecast([0, 0], [2, 6]);
    const forecasts = new Map<string, ForecastState>([
      ["hill", { status: "ready", forecast: weather }],
    ]);
    const rows = rankOpportunities([segment], forecasts, referenceRider, false);
    const cockpit = estimateRouteRideEffect(
      points,
      weather.hours[1]!,
      weather.retrievedAt,
      referenceRider,
      terrain,
    )!;
    expect(rows[0]!.bestTimeS).toBe(cockpit.windTimeS);
    expect(rows[0]!.calmTimeS).toBe(cockpit.calmTimeS);
    const sheltered = rankOpportunities(
      [{ ...segment, shelter: "dense" }],
      forecasts,
      referenceRider,
      false,
    );
    expect(sheltered[0]!.bestTimeS).toBe(
      estimateRouteRideEffect(
        points,
        weather.hours[1]!,
        weather.retrievedAt,
        referenceRider,
        terrain,
        "dense",
      )!.windTimeS,
    );
    const missing = rankOpportunities(
      [{ ...segment, terrain: null }],
      forecasts,
      referenceRider,
      false,
    )[0]!;
    expect(missing.status).toBe("unavailable");
    expect(missing.reason).toContain("Terrain not loaded");
  });
  const north = route("n", "Northbound", [
    [0, 0],
    [0, 0.01],
  ]);
  const south = route("s", "Southbound", [
    [0, 0.01],
    [0, 0],
  ]);
  const east = route("e", "Eastbound", [
    [0, 0],
    [0.01, 0],
  ]);
  it("orders segments by time gained at their best hour", () => {
    const forecasts = new Map<string, ForecastState>([
      ["n", { status: "ready", forecast: forecast([0, 0], [2, 6, null]) }],
      ["s", { status: "ready", forecast: forecast([0, 0.01], [2, 6, null]) }],
      ["e", { status: "ready", forecast: forecast([0, 0], [2, 6, null]) }],
    ]);
    const rows = rankOpportunities(
      [south, east, north],
      forecasts,
      referenceRider,
      false,
    );
    expect(rows.map((r) => r.route.id)).toEqual(["n", "e", "s"]);
    expect(rows[0]!.bestIndex).toBe(1);
    expect(rows[0]!.gainS).toBeGreaterThan(0);
    expect(rows[2]!.gainS).toBeLessThan(0);
    expect(rows[2]!.bestIndex).toBe(0);
    expect(rows[0]!.timesS).toHaveLength(3);
    expect(rows[0]!.timesS[2]).toBeNull();
    expect(rows[0]!.bestAt).toBe("2026-09-10T10:00:00.000Z");
  });
  it("keeps loading and failed segments after ranked ones", () => {
    const forecasts = new Map<string, ForecastState>([
      ["n", { status: "error", message: "Weather service unavailable." }],
      ["s", { status: "ready", forecast: forecast([0, 0.01], [3]) }],
    ]);
    const rows = rankOpportunities(
      [north, south, east],
      forecasts,
      referenceRider,
      false,
    );
    expect(rows.map((r) => [r.route.id, r.status])).toEqual([
      ["s", "ranked"],
      ["e", "loading"],
      ["n", "unavailable"],
    ]);
    expect(rows[2]!.reason).toBe("Weather service unavailable.");
  });
  it("respects the dry daylight filter", () => {
    const forecasts = new Map<string, ForecastState>([
      [
        "n",
        {
          status: "ready",
          forecast: forecast([0, 0], [6, 2], 180, [false, true]),
        },
      ],
    ]);
    const all = rankOpportunities([north], forecasts, referenceRider, false);
    const dry = rankOpportunities([north], forecasts, referenceRider, true);
    expect(all[0]!.bestIndex).toBe(0);
    expect(dry[0]!.bestIndex).toBe(1);
    const none = rankOpportunities(
      [north],
      new Map([
        [
          "n",
          {
            status: "ready" as const,
            forecast: forecast([0, 0], [6], 180, [false]),
          },
        ],
      ]),
      referenceRider,
      true,
    );
    expect(none[0]!.status).toBe("unavailable");
    expect(none[0]!.reason).toContain("dry daylight");
  });
});

describe("deterministic ordering and expiry", () => {
  const line: DrawnRoute["points"] = [
    [-0.12, 51.5],
    [-0.12, 51.505],
  ];
  it("breaks equal gains by code-unit name then id, never by locale", () => {
    const same = forecast(
      [-0.12, 51.5],
      Array.from({ length: 48 }, () => 5),
    );
    const states = new Map<string, ForecastState>([
      ["b", { status: "ready", forecast: same }],
      ["a", { status: "ready", forecast: same }],
      ["z", { status: "ready", forecast: same }],
    ]);
    const rows = rankOpportunities(
      [
        route("b", "Twin", line),
        route("a", "Twin", line),
        route("z", "Ä", line),
      ],
      states,
      referenceRider,
      false,
    );
    expect(rows.map((row) => row.gainS)).toEqual([
      rows[0]!.gainS,
      rows[0]!.gainS,
      rows[0]!.gainS,
    ]);
    // "Twin" before "Ä" by code unit (localeCompare would put "Ä" first),
    // then the two Twins by id.
    expect(rows.map((row) => row.route.id)).toEqual(["a", "b", "z"]);
  });
  it("reports the earliest expiry among loaded forecasts", () => {
    const soon = { ...forecast([-0.12, 51.5], [5]), expiresAt: 1_000 };
    const late = { ...forecast([-0.12, 51.5], [5]), expiresAt: 9_000 };
    expect(nextExpiry(new Map())).toBeNull();
    expect(nextExpiry(new Map([["a", { status: "loading" }]]))).toBeNull();
    expect(
      nextExpiry(
        new Map<string, ForecastState>([
          ["a", { status: "ready", forecast: late }],
          ["b", { status: "loading" }],
          ["c", { status: "ready", forecast: soon }],
        ]),
      ),
    ).toBe(1_000);
  });
});
