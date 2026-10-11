import { expect, it, vi } from "vitest";
import { distance } from "@turf/distance";
import { destination } from "@turf/destination";
import { getForecastConditions, sampleWeatherPoints } from "./forecast";
import {
  demoSegments,
  OpenMeteoProvider,
  syntheticOpenMeteoResponse,
  normalizeForecast,
  type WeatherProvider,
  weatherAttribution,
} from "@scout/providers";
import { type ForecastResult, type ForecastRequest } from "@scout/contracts";
const now = new Date("2026-09-07T12:00:00Z");
const options = {
  startAt: "2026-09-08T16:00:00Z",
  endAt: "2026-09-08T18:00:00Z",
  timeZone: "Europe/London",
};
const times = [options.startAt, "2026-09-08T17:00:00Z"];
const synthetic = () =>
  new OpenMeteoProvider("synthetic", {
    now: () => now.getTime(),
    fetch: async (input) => {
      const url = new URL(String(input));
      const lats = url.searchParams.get("latitude")!.split(",").map(Number);
      const lons = url.searchParams.get("longitude")!.split(",").map(Number);
      return Response.json(
        syntheticOpenMeteoResponse(
          lats.map((lat, i) => [lons[i]!, lat]),
          times,
        ),
      );
    },
  });
it("samples representative coordinates deterministically and keeps leg distances within 1 km", () => {
  const sampling = sampleWeatherPoints(demoSegments, now);
  expect(sampling.points.length).toBeLessThan(
    sampling.routes.reduce((n, r) => n + r.geometry.legs.length, 0),
  );
  expect(sampleWeatherPoints([...demoSegments].reverse(), now)).toEqual(
    sampling,
  );
  for (const route of sampling.routes)
    route.geometry.legs.forEach((leg, i) => {
      const midpoint = destination(
        leg.start,
        leg.distanceM / 2,
        leg.bearingDegrees,
        { units: "meters" },
      );
      expect(
        distance(midpoint, sampling.points[route.sampleIndices[i]!]!, {
          units: "meters",
        }),
      ).toBeLessThanOrEqual(1000 + 1e-6);
    });
});
it("joins supplied sample hours to every leg and propagates attribution", async () => {
  const result = await getForecastConditions(
    demoSegments,
    options,
    synthetic(),
    now,
  );
  expect(result.errors).toEqual([]);
  expect(result.hourly).toHaveLength(4);
  expect(result.opportunities).toHaveLength(2);
  expect(result.weather.status).toBe("fresh");
  expect(
    result.hourly[0]!.sources.some(
      (s) => s.attribution?.url === weatherAttribution.url,
    ),
  ).toBe(true);
  expect(result.weather.snapshots[0]!.metadata.modelIssuedAt).toBeNull();
});
it("excludes uncovered hours with explicit errors instead of extrapolation", async () => {
  const provider: WeatherProvider = {
    getForecast: async (request) => ({
      status: "fresh",
      snapshots: normalizeForecast(
        syntheticOpenMeteoResponse(request.points, [times[0]!]),
        request,
        now.getTime(),
        "synthetic",
      ),
      error: null,
    }),
  };
  const result = await getForecastConditions(
    demoSegments,
    options,
    provider,
    now,
  );
  expect(result.hourly).toHaveLength(2);
  expect(result.errors).toHaveLength(2);
  expect(
    result.errors.every(
      (e) => e.code === "FORECAST_UNAVAILABLE" && e.attemptAt === times[1],
    ),
  ).toBe(true);
});
it("does not send denied segment coordinates to any provider", async () => {
  const getForecast = vi.fn<WeatherProvider["getForecast"]>();
  const denied = demoSegments.map((s) => ({
    ...s,
    provenance: { ...s.provenance, sourceKind: "strava-rest" as const },
  }));
  const result = await getForecastConditions(
    denied,
    options,
    { getForecast },
    now,
  );
  expect(getForecast).not.toHaveBeenCalled();
  expect(result.errors.every((e) => e.code === "SOURCE_NOT_PERMITTED")).toBe(
    true,
  );
});
it("surfaces stale data with retrieval time, but refuses to rank it", async () => {
  const provider: WeatherProvider = {
    getForecast: async (request) => ({
      status: "stale",
      snapshots: normalizeForecast(
        syntheticOpenMeteoResponse(request.points, times),
        request,
        now.getTime(),
        "synthetic",
      ),
      error: { code: "FORECAST_UNAVAILABLE", retryAt: null },
    }),
  };
  const result = await getForecastConditions(
    demoSegments,
    options,
    provider,
    now,
  );
  expect(result.weather.status).toBe("stale");
  expect(result.weather.snapshots[0]!.retrievedAt).toBe(
    now.toISOString().replace(".000", ""),
  );
  expect(result.opportunities).toEqual([]);
});
it("allows registered demo weather and rejects malformed spatial association or provider failure", async () => {
  const live: WeatherProvider = {
    getForecast: async (request) => ({
      status: "fresh",
      snapshots: normalizeForecast(
        syntheticOpenMeteoResponse(request.points, times),
        request,
        now.getTime(),
        "live",
      ),
      error: null,
    }),
  };
  const result = await getForecastConditions(demoSegments, options, live, now);
  expect(result.errors).toEqual([]);
  expect(
    result.hourly[0]!.sources.some((s) => s.sourceKind === "open-meteo"),
  ).toBe(true);
  const swapped: WeatherProvider = {
    getForecast: async (request) => {
      const r = await live.getForecast(request);
      r.snapshots[0]!.requestedCoordinate = [10, 20];
      return r;
    },
  };
  expect(
    (await getForecastConditions(demoSegments, options, swapped, now)).weather
      .status,
  ).toBe("unavailable");
  const throws: WeatherProvider = {
    getForecast: async () => {
      throw new Error("do not expose provider payload");
    },
  };
  const failed = await getForecastConditions(
    demoSegments,
    options,
    throws,
    now,
  );
  expect(failed.weather.error?.code).toBe("FORECAST_UNAVAILABLE");
  expect(JSON.stringify(failed)).not.toContain("do not expose");
});
it("continues valid routes after a geometry failure and bounds sampling work", async () => {
  const bad = {
    ...demoSegments[0]!,
    id: "bad",
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [0, 51],
        [0, 51],
      ] as [number, number][],
    },
  };
  const result = await getForecastConditions(
    [...demoSegments, bad],
    options,
    synthetic(),
    now,
  );
  expect(result.opportunities).toHaveLength(2);
  expect(result.errors[0]!.code).toBe("GEOMETRY_INVALID");
  const long = {
    ...demoSegments[0]!,
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [0, 0],
        [0, 1],
      ] as [number, number][],
    },
  };
  expect(sampleWeatherPoints([long], now).errors[0]!.code).toBe(
    "CAPABILITY_UNAVAILABLE",
  );
});
it("selects only supplied UTC hours inside a fractional local window", async () => {
  const calls: ForecastRequest[] = [];
  const provider: WeatherProvider = {
    getForecast: async (request) => {
      calls.push(request);
      return {
        status: "unavailable",
        snapshots: [],
        error: { code: "FORECAST_UNAVAILABLE", retryAt: null },
      } satisfies ForecastResult;
    },
  };
  await getForecastConditions(
    demoSegments,
    { ...options, startAt: "2026-09-08T16:30:00Z" },
    provider,
    now,
  );
  expect(calls).toHaveLength(1);
  expect(calls[0]!.window.startAt).toBe("2026-09-08T16:30:00Z");
});

it.each([
  ["denied-metadata", { snapshots: [] }],
  ["old-freshness", { status: "stale" }],
  ["expired", { snapshots: [] }],
] as const)(
  "withholds disclosure when a snapshot is %s",
  async (kind, weather) => {
    const provider: WeatherProvider = {
      getForecast: async (request) => {
        const snapshots = normalizeForecast(
          syntheticOpenMeteoResponse(request.points, times),
          request,
          now.getTime(),
          "synthetic",
        );
        for (const snapshot of snapshots) {
          if (kind === "denied-metadata")
            snapshot.provenance.policy.derivedOutputs = false;
          if (kind === "old-freshness")
            snapshot.freshUntil = "2026-09-07T11:59:00Z";
          if (kind === "expired") snapshot.expiresAt = "2026-09-07T11:59:00Z";
        }
        return { status: "fresh", snapshots, error: null };
      },
    };
    const result = await getForecastConditions(
      demoSegments,
      options,
      provider,
      now,
    );
    expect(result.hourly).toEqual([]);
    expect(result.weather).toMatchObject(weather);
  },
);
