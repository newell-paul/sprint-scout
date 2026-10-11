import { afterEach, expect, it, vi } from "vitest";
import { type ForecastRequest } from "@scout/contracts";
import {
  OpenMeteoProvider,
  normalizeForecast,
  FRESH_MS,
  RETENTION_MS,
  defaultForecastWindow,
  hourlyInstants,
} from "./weather";
import { syntheticOpenMeteoResponse } from "./weather-fixtures";
const now = Date.parse("2026-09-07T12:00:00Z");
const times = ["2026-09-08T16:00:00Z", "2026-09-08T17:00:00Z"];
const request: ForecastRequest = {
  points: [
    [0, 51],
    [0.01, 51],
  ],
  window: { startAt: times[0]!, endAt: "2026-09-08T18:00:00Z" },
};
const fixture = () => syntheticOpenMeteoResponse(request.points, times);
afterEach(() => vi.useRealTimers());
it("normalizes UTC, units, nullable values, grid coordinates and real metadata only", () => {
  const raw = fixture();
  const r = raw[0]!;
  r.latitude = 51.001;
  r.hourly_units.wind_speed_10m = "km/h";
  r.hourly.wind_speed_10m = [18, 0];
  r.hourly.wind_direction_10m = [360, 1];
  r.hourly_units.temperature_2m = "°F";
  r.hourly.temperature_2m = [68, 32];
  r.hourly_units.precipitation = "inch";
  r.hourly.precipitation = [1, 0];
  const output = normalizeForecast(raw, request, now, "live");
  const s = output[0]!;
  expect(s.requestedCoordinate).toEqual([0, 51]);
  expect(s.gridCoordinate).toEqual([0, 51.001]);
  expect(s.hours[0]).toMatchObject({
    windSpeedMps: 5,
    windFromDegrees: 0,
    temperatureC: 20,
    precipitationMm: 25.4,
  });
  expect(s.metadata).toMatchObject({
    model: null,
    modelIssuedAt: null,
    elevationM: 20,
    utcOffsetSeconds: 0,
  });
  expect(s.retrievedAt).toBe("2026-09-07T12:00:00Z");
  expect(s.attribution.url).toBe("https://open-meteo.com/");
  expect(s.hours[0]!.provenance.attribution).toEqual(s.attribution);
});
it("preserves missing columns and null cells without calm or direction averaging", () => {
  const raw = fixture() as unknown as { hourly: Record<string, unknown> }[];
  delete raw[0]!.hourly.wind_speed_10m;
  delete raw[0]!.hourly.wind_gusts_10m;
  raw[0]!.hourly.precipitation = [null, 0];
  const hours = normalizeForecast(raw, request, now, "synthetic")[0]!.hours;
  expect(hours[0]).toMatchObject({
    windSpeedMps: null,
    gustMps: null,
    precipitationMm: null,
    windFromDegrees: 359,
  });
  expect(hours[1]!.windFromDegrees).toBe(1);
});
it("rejects invalid units, arrays, time order, timezone offsets and values", () => {
  const cases: ((raw: ReturnType<typeof fixture>) => void)[] = [
    (r) => {
      r[0]!.hourly_units.wind_speed_10m = "unknown";
    },
    (r) => {
      r[0]!.hourly.temperature_2m = [];
    },
    (r) => {
      r[0]!.hourly.time.reverse();
    },
    (r) => {
      r[0]!.hourly.time[0] = "2026-02-30T16:00";
    },
    (r) => {
      r[0]!.utc_offset_seconds = 3600;
    },
    (r) => {
      r[0]!.hourly.wind_speed_10m[0] = -1;
    },
    (r) => {
      r[0]!.latitude = 100;
    },
    (r) => {
      r[0]!.hourly.time[1] = r[0]!.hourly.time[0]!;
    },
  ];
  for (const change of cases) {
    const raw = fixture();
    change(raw);
    expect(() => normalizeForecast(raw, request, now, "synthetic")).toThrow(
      "FORECAST_UNAVAILABLE",
    );
  }
  expect(() => normalizeForecast([], request, now, "synthetic")).toThrow();
});
it("batches points, requests SI/UTC and shares concurrent/identical requests without mutable cache leaks", async () => {
  let current = now;
  const transport = vi.fn<typeof fetch>(async () => Response.json(fixture()));
  const provider = new OpenMeteoProvider("synthetic", {
    fetch: transport,
    now: () => current,
  });
  const [a, b] = await Promise.all([
    provider.getForecast(request),
    provider.getForecast(request),
  ]);
  expect(transport).toHaveBeenCalledTimes(1);
  expect(a).toEqual(b);
  const url = new URL(String(transport.mock.calls[0]![0]));
  expect(url.origin).toBe("https://api.open-meteo.com");
  expect(url.searchParams.get("latitude")).toBe("51,51");
  expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
  expect(url.searchParams.get("timezone")).toBe("GMT");
  expect(url.searchParams.get("end_hour")).toBe("2026-09-08T17:00");
  a.snapshots[0]!.hours[0]!.windSpeedMps = 999;
  expect(
    (await provider.getForecast(request)).snapshots[0]!.hours[0]!.windSpeedMps,
  ).toBe(3);
  current += FRESH_MS - 1;
  await provider.getForecast(request);
  expect(transport).toHaveBeenCalledTimes(1);
  current++;
  await provider.getForecast(request);
  expect(transport).toHaveBeenCalledTimes(2);
});
it("returns stale with original retrieval time after bounded retries; expires after six hours", async () => {
  let current = now;
  let failing = false;
  const transport = vi.fn<typeof fetch>(async () =>
    failing ? new Response("", { status: 503 }) : Response.json(fixture()),
  );
  const sleep = vi.fn(async (ms: number) => {
    current += ms;
  });
  const provider = new OpenMeteoProvider("synthetic", {
    fetch: transport,
    now: () => current,
    sleep,
    random: () => 0,
  });
  await provider.getForecast(request);
  failing = true;
  current += FRESH_MS;
  const result = await provider.getForecast(request);
  expect(result.status).toBe("stale");
  expect(result.error?.code).toBe("FORECAST_UNAVAILABLE");
  expect(result.snapshots[0]!.retrievedAt).toBe("2026-09-07T12:00:00Z");
  expect(transport).toHaveBeenCalledTimes(4);
  expect(sleep.mock.calls.map((c) => c[0])).toEqual([250, 500]);
  current = now + RETENTION_MS;
  expect((await provider.getForecast(request)).status).toBe("unavailable");
});
it("honours Retry-After and suppresses requests during provider cooldown", async () => {
  let current = now;
  const transport = vi.fn<typeof fetch>(
    async () =>
      new Response("", { status: 429, headers: { "retry-after": "60" } }),
  );
  const provider = new OpenMeteoProvider("synthetic", {
    fetch: transport,
    now: () => current,
    sleep: async (ms) => {
      current += ms;
    },
  });
  const first = await provider.getForecast(request);
  expect(first.error).toEqual({
    code: "RATE_LIMITED",
    retryAt: "2026-09-07T12:01:00Z",
  });
  await provider.getForecast(request);
  expect(transport).toHaveBeenCalledTimes(1);
  current += 60000;
  await provider.getForecast(request);
  expect(transport).toHaveBeenCalledTimes(2);
});
it("retries short Retry-After and accepts an eventual response", async () => {
  let current = now;
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response("", { status: 429, headers: { "retry-after": "1" } }),
    )
    .mockImplementation(async () => Response.json(fixture()));
  const sleep = vi.fn(async (ms: number) => {
    current += ms;
  });
  const provider = new OpenMeteoProvider("synthetic", {
    fetch: transport,
    now: () => current,
    sleep,
    random: () => 0,
  });
  expect((await provider.getForecast(request)).status).toBe("fresh");
  expect(sleep).toHaveBeenCalledWith(1000);
  expect(transport).toHaveBeenCalledTimes(2);
});
it("times out stalled transport and never exceeds three attempts", async () => {
  vi.useFakeTimers();
  const transport = vi.fn<typeof fetch>(() => new Promise(() => {}));
  const provider = new OpenMeteoProvider("synthetic", {
    fetch: transport,
    now: () => now,
    sleep: async () => {},
    random: () => 0,
  });
  const job = provider.getForecast(request);
  await vi.advanceTimersByTimeAsync(15001);
  expect((await job).status).toBe("unavailable");
  expect(transport).toHaveBeenCalledTimes(3);
  expect(
    transport.mock.calls.every((c) => (c[1]?.signal as AbortSignal).aborted),
  ).toBe(true);
});
it("does not retry malformed payloads, permanent errors or oversized bodies", async () => {
  for (const response of [
    new Response("", { status: 400 }),
    Response.json({ bad: true }),
    new Response("not JSON"),
    new Response("x".repeat(2_000_001)),
  ]) {
    const transport = vi.fn<typeof fetch>(async () => response);
    const result = await new OpenMeteoProvider("synthetic", {
      fetch: transport,
      now: () => now,
    }).getForecast(request);
    expect(result.status).toBe("unavailable");
    expect(transport).toHaveBeenCalledTimes(1);
  }
});
it("live access defaults off and is bounded to deliberately selected demo coordinates", async () => {
  const transport = vi.fn<typeof fetch>(async () => Response.json(fixture()));
  expect(
    (
      await new OpenMeteoProvider("disabled", { fetch: transport }).getForecast(
        request,
      )
    ).error?.code,
  ).toBe("SOURCE_NOT_PERMITTED");
  const provider = new OpenMeteoProvider("live-demo", {
    fetch: transport,
    now: () => now,
  });
  expect(
    (await provider.getForecast({ ...request, points: [[10, 20]] })).error
      ?.code,
  ).toBe("SOURCE_NOT_PERMITTED");
  expect(
    (
      await provider.getForecast({
        ...request,
        window: {
          startAt: "2026-08-01T00:00:00Z",
          endAt: "2026-08-02T00:00:00Z",
        },
      })
    ).error?.code,
  ).toBe("OUTSIDE_FORECAST_RANGE");
  expect(transport).not.toHaveBeenCalled();
});
it("bounds points and hours, labels gaps and limits output to actual coverage", async () => {
  const provider = new OpenMeteoProvider("synthetic", {
    fetch: async () => Response.json(fixture()),
    now: () => now,
  });
  expect(
    (
      await provider.getForecast({
        ...request,
        points: Array.from({ length: 51 }, () => [0, 51]),
      })
    ).status,
  ).toBe("unavailable");
  expect(
    (
      await provider.getForecast({
        ...request,
        window: { startAt: times[0]!, endAt: "2026-09-11T00:00:00Z" },
      })
    ).error?.code,
  ).toBe("OUTSIDE_FORECAST_RANGE");
  const partial = normalizeForecast(
    syntheticOpenMeteoResponse(request.points, [times[1]!]),
    request,
    now,
    "synthetic",
  );
  expect(partial[0]!.warnings).toContain("PARTIAL_COVERAGE");
  expect(partial[0]!.hours).toHaveLength(1);
  expect(defaultForecastWindow(new Date("2026-09-07T12:15:00Z"))).toEqual({
    startAt: "2026-09-07T13:00:00Z",
    endAt: "2026-09-09T13:00:00Z",
  });
  expect(
    hourlyInstants({
      startAt: "2026-09-08T16:30:00Z",
      endAt: "2026-09-08T18:00:00Z",
    }),
  ).toEqual([times[1]]);
});
