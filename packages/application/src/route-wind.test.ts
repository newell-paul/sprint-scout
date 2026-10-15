import { describe, expect, it, vi } from "vitest";
import {
  describeRouteWind,
  estimateRouteRideEffect,
  loadRouteWind,
  parseRouteWind,
  routeCrosswind,
} from "./route-wind";
describe("segment elapsed-time estimates", () => {
  const points = [
    [0, 0],
    [0, 0.01],
  ];
  const at = "2026-09-10T09:00:00Z";
  it("uses 40 km/h in still air and responds to headwinds and tailwinds", () => {
    const calm = estimateRouteRideEffect(points, {
      at,
      speedMps: 0,
      fromDegrees: null,
    })!;
    expect(calm.calmTimeS).toBeCloseTo(100.07557, 4);
    expect(calm.windTimeS).toBeCloseTo(calm.calmTimeS, 8);
    expect(calm.timeRange).toBeNull();
    const tail = estimateRouteRideEffect(
      points,
      { at, speedMps: 5, fromDegrees: 180 },
      at,
    )!;
    const head = estimateRouteRideEffect(
      [...points].reverse(),
      { at, speedMps: 5, fromDegrees: 180 },
      at,
    )!;
    expect(tail.windTimeS).toBeLessThan(calm.calmTimeS);
    expect(head.windTimeS).toBeGreaterThan(calm.calmTimeS);
    expect(tail.windTimeS - tail.calmTimeS).toBeCloseTo(tail.timeDeltaS, 8);
    expect(tail.timeRange!.lowS).toBeLessThan(tail.windTimeS);
    expect(tail.timeRange!.highS).toBeGreaterThan(tail.windTimeS);
    const outAndBack = estimateRouteRideEffect([...points, [0, 0]], {
      at,
      speedMps: 5,
      fromDegrees: 180,
    })!;
    expect(outAndBack.windTimeS).toBeCloseTo(
      tail.windTimeS + head.windTimeS,
      8,
    );
  });
  it("does not invent times for missing wind or invalid geometry", () => {
    expect(
      estimateRouteRideEffect(points, {
        at,
        speedMps: null,
        fromDegrees: null,
      }),
    ).toBeNull();
    expect(
      estimateRouteRideEffect(
        [
          [0, 0],
          [0, 0],
        ],
        { at, speedMps: 0, fromDegrees: null },
      ),
    ).toBeNull();
  });
});
describe("plain-language route wind", () => {
  const points = [
    [0, 0],
    [0, 0.01],
  ];
  it("distinguishes riding direction, crosswind, calm and missing data", () => {
    expect(describeRouteWind(points, { speedMps: 5, fromDegrees: 180 })).toBe(
      "Tailwind",
    );
    expect(
      describeRouteWind([...points].reverse(), {
        speedMps: 5,
        fromDegrees: 180,
      }),
    ).toBe("Headwind");
    expect(describeRouteWind(points, { speedMps: 5, fromDegrees: 90 })).toBe(
      "Mostly crosswind",
    );
    expect(describeRouteWind(points, { speedMps: 0, fromDegrees: null })).toBe(
      "Calm",
    );
    expect(
      describeRouteWind(points, { speedMps: null, fromDegrees: null }),
    ).toBe("Wind unavailable");
    expect(describeRouteWind(points, { speedMps: 5, fromDegrees: null })).toBe(
      "Route wind unavailable",
    );
  });
  it("keeps opposing legs visible rather than calling an out-and-back calm", () => {
    expect(
      describeRouteWind([...points, [0, 0]], { speedMps: 5, fromDegrees: 180 }),
    ).toBe("Mixed headwind and tailwind");
  });
});
const start = Date.parse("2026-09-09T12:00:00Z");
const fixture = () => ({
  utc_offset_seconds: 0,
  hourly_units: {
    time: "unixtime",
    wind_speed_10m: "m/s",
    wind_direction_10m: "°",
  },
  hourly: {
    time: [start / 1000, start / 1000 + 3600, start / 1000 + 7200],
    wind_speed_10m: [5, 0, null],
    wind_direction_10m: [180, null, 30],
  },
});
describe("independent route wind preview", () => {
  it("parses optional conditions, preserves missing data, and rejects invalid units", () => {
    const base = fixture();
    const input = {
      ...base,
      hourly_units: {
        ...base.hourly_units,
        wind_gusts_10m: "m/s",
        precipitation: "mm",
        precipitation_probability: "%",
      },
      hourly: {
        ...base.hourly,
        wind_gusts_10m: [8, 0, null],
        precipitation: [0.5, 0, null],
        precipitation_probability: [60, 0, null],
      },
    };
    const hours = parseRouteWind(input, start);
    expect(hours[0]).toMatchObject({
      gustMps: 8,
      precipitationMm: 0.5,
      precipitationProbabilityPct: 60,
    });
    expect(hours[1]).toMatchObject({
      gustMps: 0,
      precipitationMm: 0,
      precipitationProbabilityPct: 0,
    });
    expect(hours[2]?.gustMps).toBeNull();
    expect(hours[47]?.precipitationMm).toBeNull();
    expect(parseRouteWind(base, start)[0]?.gustMps).toBeNull();
    input.hourly_units.wind_gusts_10m = "km/h";
    expect(() => parseRouteWind(input, start)).toThrow();
    input.hourly_units.wind_gusts_10m = "m/s";
    input.hourly.precipitation_probability[0] = 101;
    expect(() => parseRouteWind(input, start)).toThrow();
    input.hourly.precipitation_probability = [1];
    expect(() => parseRouteWind(input, start)).toThrow();
  });
  it("reports distance-weighted crosswind without treating missing wind as calm", () => {
    const north = [
      [0, 0],
      [0, 0.01],
    ];
    expect(routeCrosswind(north, { speedMps: 5, fromDegrees: 90 })).toBeCloseTo(
      5,
    );
    expect(
      routeCrosswind(north, { speedMps: 5, fromDegrees: 180 }),
    ).toBeCloseTo(0);
    expect(
      routeCrosswind([...north, [0.01, 0.01]], {
        speedMps: 5,
        fromDegrees: 90,
      }),
    ).toBeCloseTo(2.5, 4);
    expect(routeCrosswind(north, { speedMps: 0, fromDegrees: null })).toBe(0);
    expect(
      routeCrosswind(north, { speedMps: null, fromDegrees: null }),
    ).toBeNull();
    expect(
      routeCrosswind(north, { speedMps: 5, fromDegrees: null }),
    ).toBeNull();
  });
  it("converts from to flow and retains calm and missing hourly slots", () => {
    const rows = parseRouteWind(fixture(), start);
    expect(rows).toHaveLength(48);
    expect(rows[0]?.flowDegrees).toBe(0);
    expect(rows[0]?.speedMps).toBe(5);
    expect(rows[1]?.speedMps).toBe(0);
    expect(rows[1]?.flowDegrees).toBeNull();
    expect(rows[2]?.speedMps).toBeNull();
    expect(rows[47]?.speedMps).toBeNull();
    const input = fixture();
    input.hourly.wind_direction_10m[0] = 360;
    expect(parseRouteWind(input, start)[0]?.flowDegrees).toBe(180);
  });
  it("parses optional weather code and day flag, ignoring invalid values", () => {
    const input = fixture() as ReturnType<typeof fixture> & {
      hourly: { weather_code?: unknown[]; is_day?: unknown[] };
    };
    input.hourly.weather_code = [3, 200, null];
    input.hourly.is_day = [1, 0, "x"];
    const rows = parseRouteWind(input, start);
    expect(rows[0]?.weatherCode).toBe(3);
    expect(rows[0]?.isDay).toBe(true);
    expect(rows[1]?.weatherCode).toBeNull();
    expect(rows[1]?.isDay).toBe(false);
    expect(rows[2]?.isDay).toBeNull();
    expect(parseRouteWind(fixture(), start)[0]?.weatherCode).toBeNull();
    input.hourly.weather_code = [1];
    expect(() => parseRouteWind(input, start)).toThrow();
  });
  it("rejects unknown units, duplicate times and invalid directions", () => {
    const units = fixture();
    units.hourly_units.wind_speed_10m = "km/h";
    const times = fixture();
    times.hourly.time[1] = times.hourly.time[0]!;
    const direction = fixture();
    direction.hourly.wind_direction_10m[0] = 361;
    for (const input of [units, times, direction])
      expect(() => parseRouteWind(input, start)).toThrow();
  });
  it("accepts 48 rows and refuses 49", () => {
    const rows = (n: number) => {
      const input = fixture();
      input.hourly = {
        time: Array.from({ length: n }, (_, i) => start / 1000 + i * 3600),
        wind_speed_10m: Array.from({ length: n }, () => 5),
        wind_direction_10m: Array.from({ length: n }, () => 180),
      };
      return input;
    };
    expect(parseRouteWind(rows(48), start)).toHaveLength(48);
    expect(() => parseRouteWind(rows(49), start)).toThrow();
  });
  it("reads a body of 100,000 bytes and refuses one byte more", async () => {
    // Padding sits in an ignored field, so only the size guard can refuse it.
    const padded = (bytes: number) => {
      const body = { ...fixture(), padding: "" };
      const size = new TextEncoder().encode(JSON.stringify(body)).length;
      body.padding = "x".repeat(bytes - size);
      return new Response(JSON.stringify(body));
    };
    const load = (response: Response) =>
      loadRouteWind(
        { point: [0, 51], independentConfirmed: true, weatherConsent: true },
        new AbortController().signal,
        vi.fn<typeof fetch>().mockResolvedValue(response),
        new Date(start),
      );
    await expect(load(padded(100_000))).resolves.toMatchObject({
      point: [0, 51],
    });
    await expect(load(padded(100_001))).rejects.toThrow(
      "Weather response is too large.",
    );
  });
  it("checks consent and coordinates before network access", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const input of [
      { point: [0, 51], independentConfirmed: false, weatherConsent: true },
      { point: [0, 51], independentConfirmed: true, weatherConsent: false },
      { point: [999, 51], independentConfirmed: true, weatherConsent: true },
    ])
      await expect(
        loadRouteWind(input, new AbortController().signal, fetcher),
      ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("makes one bounded SI request without route names and rejects outages", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(fixture()));
    const result = await loadRouteWind(
      { point: [0, 51], independentConfirmed: true, weatherConsent: true },
      new AbortController().signal,
      fetcher,
      new Date(start),
    );
    expect(result.hours).toHaveLength(48);
    expect(fetcher).toHaveBeenCalledOnce();
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
    expect(url.searchParams.get("hourly")).toBe(
      "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,weather_code,is_day",
    );
    expect(url.searchParams.get("end_hour")).toBe("2026-09-11T11:00");
    fetcher.mockResolvedValue(new Response("", { status: 429 }));
    await expect(
      loadRouteWind(
        { point: [0, 51], independentConfirmed: true, weatherConsent: true },
        new AbortController().signal,
        fetcher,
      ),
    ).rejects.toThrow("rate limit");
  });
});

describe("estimateRouteRideEffect", () => {
  it("returns a tailwind gain for a northbound route with wind from the south", async () => {
    const { estimateRouteRideEffect } = await import("./route-wind");
    const effect = estimateRouteRideEffect(
      [
        [-0.12, 51.5],
        [-0.12, 51.51],
      ],
      { speedMps: 5, fromDegrees: 180, at: "2026-09-10T12:00:00Z" },
      "2026-09-09T12:00:00Z",
    );
    expect(effect?.speedDeltaMps).toBeGreaterThan(0);
    expect(effect?.timeDeltaS).toBeLessThan(0);
    expect(effect?.band?.leadHours).toBe(24);
    expect(effect?.band?.speedDeltaLowMps).toBeLessThan(effect!.speedDeltaMps);
  });
  it("returns null for missing wind or invalid geometry", async () => {
    const { estimateRouteRideEffect } = await import("./route-wind");
    expect(
      estimateRouteRideEffect(
        [
          [0, 0],
          [0, 0.01],
        ],
        { speedMps: null, fromDegrees: null, at: "2026-09-09T12:00:00Z" },
      ),
    ).toBeNull();
    expect(
      estimateRouteRideEffect("nope", {
        speedMps: 5,
        fromDegrees: 180,
        at: "2026-09-09T12:00:00Z",
      }),
    ).toBeNull();
  });
});
describe("owner rider", () => {
  const bend = [
    [0, 0],
    [0, 0.005],
    [0.005, 0.005],
  ];
  it("uses an owner rider when supplied", async () => {
    const { riderFromPower } = await import("@scout/analysis");
    const rider = riderFromPower({ powerW: 200, massKg: 75, cdaM2: 0.3 });
    const effect = estimateRouteRideEffect(
      bend,
      { at: "2026-09-10T09:00:00Z", speedMps: 0, fromDegrees: null },
      undefined,
      rider,
    )!;
    expect(effect.calmSpeedMps).toBeCloseTo(rider.calmSpeedKmh / 3.6, 8);
    expect(effect.calmSpeedMps).not.toBeCloseTo(40 / 3.6, 2);
  });
});
