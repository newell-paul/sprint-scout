import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  defaultOpenMeteoConfig,
  openMeteoHosts,
  recorded,
  recordedForecastStartS,
} from "@scout/testing";
import { http, HttpResponse, openMeteoServer } from "@scout/testing/msw";
import { loadRouteWind, parseRouteWind } from "./route-wind";
import { loadTerrain, sampleTerrain } from "./terrain";

// Contract tests: the browser loaders consume recorded live responses and the
// shared handlers through the real global fetch, not a hand-written stub.
const config = defaultOpenMeteoConfig();
const server = openMeteoServer(config);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  config.faults = { weather: "ok", elevation: "ok", archive: "ok" };
});
afterAll(() => server.close());
const input = {
  point: [-0.12, 51.5],
  independentConfirmed: true,
  weatherConsent: true,
};
const route = [
  [-0.12, 51.5],
  [-0.12, 51.51],
];
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
  it("load a live elevation recording into a terrain profile", async () => {
    const heights = recorded().elevation.elevation;
    const samples = sampleTerrain(route).points.length;
    server.use(
      http.get(
        openMeteoHosts.elevation,
        ({ request }: { request: Request }) => {
          const count = new URL(request.url).searchParams
            .get("latitude")!
            .split(",").length;
          return HttpResponse.json({
            elevation: Array.from(
              { length: count },
              (_, i) => heights[i % heights.length],
            ),
          });
        },
      ),
    );
    const profile = await loadTerrain(route, true, signal(), fetch, now);
    expect(profile.elevationsM).toHaveLength(samples);
    expect(profile.elevationsM[0]).toBe(1);
  });
});

describe("shared handlers through fetch", () => {
  it("serve the default forecast and elevation", async () => {
    const forecast = await loadRouteWind(input, signal(), fetch, now);
    expect(forecast.hours[0]!.speedMps).toBe(4);
    const profile = await loadTerrain(route, true, signal(), fetch, now);
    expect(profile.elevationsM.length).toBeGreaterThan(0);
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
  it("surface incomplete elevation as the documented error", async () => {
    config.faults.elevation = "incomplete";
    await expect(
      loadTerrain(route, true, signal(), fetch, now),
    ).rejects.toThrow("Elevation is incomplete or invalid");
  });
});
