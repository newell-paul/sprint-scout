import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  defaultOpenMeteoConfig,
  openMeteoHosts,
  recorded,
  recordedForecastStartS,
} from "@scout/testing";
import { http, HttpResponse, openMeteoServer } from "@scout/testing/msw";
import { loadRouteWind, parseRouteWind } from "./route-wind";

// Contract tests: the browser loaders consume recorded live responses and the
// shared handlers through the real global fetch, not a hand-written stub.
const config = defaultOpenMeteoConfig();
const server = openMeteoServer(config);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  config.faults = { weather: "ok", archive: "ok" };
});
afterAll(() => server.close());
const input = {
  point: [-0.12, 51.5],
  independentConfirmed: true,
  weatherConsent: true,
};
const signal = () => new AbortController().signal;
const now = new Date("2026-09-11T07:00:00Z");

describe("recorded Open-Meteo responses", () => {
  it("parse a live forecast recording into 48 usable hours", () => {
    const start = recordedForecastStartS() * 1000;
    const hours = parseRouteWind(recorded().forecast, start);
    expect(hours).toHaveLength(48);
    expect(
      hours.every((h) => h.speedMps !== null && h.fromDegrees !== null),
    ).toBe(true);
    expect(hours[0]!.at).toBe(new Date(start).toISOString());
    expect(hours[0]!.gustMps).not.toBeNull();
    expect(hours[0]!.precipitationProbabilityPct).not.toBeNull();
  });
  it("load a live forecast recording through fetch", async () => {
    const start = recordedForecastStartS() * 1000;
    server.use(
      http.get(openMeteoHosts.forecast, () =>
        HttpResponse.json(recorded().forecast),
      ),
    );
    const forecast = await loadRouteWind(
      input,
      signal(),
      fetch,
      new Date(start),
    );
    expect(forecast.hours.filter((h) => h.speedMps !== null)).toHaveLength(48);
    expect(forecast.point).toEqual([-0.12, 51.5]);
  });
});

describe("shared handlers through fetch", () => {
  it("serve the default forecast", async () => {
    const forecast = await loadRouteWind(input, signal(), fetch, now);
    expect(forecast.hours[0]!.speedMps).toBe(4);
  });
  it.each([
    ["outage", "Weather service unavailable"],
    ["rateLimit", "rate limit"],
    ["empty", "Unexpected forecast units"],
  ] as const)(
    "surface a %s fault as the documented error",
    async (fault, message) => {
      config.faults.weather = fault;
      await expect(loadRouteWind(input, signal(), fetch, now)).rejects.toThrow(
        message,
      );
    },
  );
});
