import { describe, expect, it } from "vitest";
import {
  openMeteoArchiveResponse,
  openMeteoElevationResponse,
  openMeteoForecastResponse,
} from "@scout/contracts";
import {
  archiveBody,
  defaultOpenMeteoConfig,
  elevationBody,
  forecastBody,
  recorded,
  recordedForecastStartS,
} from "./open-meteo";
import { openMeteoHandlers } from "./msw";
import { storageFixtures } from "./storage";

describe("recorded Open-Meteo fixtures", () => {
  it("parse through the contract schemas", () => {
    const fixtures = recorded();
    expect(fixtures.forecast.hourly.time).toHaveLength(48);
    expect(fixtures.forecast.hourly_units.wind_speed_10m).toBe("m/s");
    expect(fixtures.forecastIso).toHaveLength(2);
    expect(fixtures.forecastIso[0]!.hourly_units.temperature_2m).toBe("°C");
    expect(fixtures.elevation.elevation).toHaveLength(11);
    expect(fixtures.archive.hourly.time).toHaveLength(48);
    expect(recordedForecastStartS() % 3600).toBe(0);
  });
});

describe("shared response builders", () => {
  it("build schema-valid bodies with per-hour overrides", () => {
    const config = defaultOpenMeteoConfig();
    config.wind.gust = 10;
    config.hours[3] = { speed: null, gust: null, code: 61, isDay: 0 };
    const body = openMeteoForecastResponse.parse(
      forecastBody(config, 1_789_315_200),
    );
    expect(body.hourly.wind_speed_10m![3]).toBeNull();
    expect(body.hourly.wind_gusts_10m![3]).toBeNull();
    expect(body.hourly.wind_gusts_10m![4]).toBe(10);
    expect(body.hourly.weather_code![3]).toBe(61);
    expect(body.hourly.is_day![3]).toBe(0);
    expect(body.hourly.time[47]).toBe(1_789_315_200 + 47 * 3600);
    const elevation = openMeteoElevationResponse.parse(
      elevationBody(config, [51.5, 51.51]),
    ).elevation;
    expect(elevation[0]).toBe(50);
    expect(elevation[1]).toBeCloseTo(50 + 0.01 * 111195 * 0.04, 6);
  });
  it("mark the second elevation sample missing when incomplete", () => {
    const config = defaultOpenMeteoConfig();
    config.faults.elevation = "incomplete";
    expect(
      elevationBody(config, [51.5, 51.501, 51.502]).elevation[1],
    ).toBeNull();
  });
  it("expose msw handlers for every endpoint", () => {
    expect(openMeteoHandlers().map((h) => h.info.header)).toEqual([
      "GET https://api.open-meteo.com/v1/forecast",
      "GET https://api.open-meteo.com/v1/elevation",
      "GET https://archive-api.open-meteo.com/v1/archive",
    ]);
  });
  it("build whole-day archive bodies", () => {
    const body = openMeteoArchiveResponse.parse(
      archiveBody(defaultOpenMeteoConfig(), "2026-09-01", "2026-09-03"),
    );
    expect(body.hourly.time).toHaveLength(72);
    expect(body.hourly.time[0]).toBe(Date.parse("2026-09-01T00:00:00Z") / 1000);
  });
  it("carry recorded storage shapes as strings", () => {
    for (const raw of Object.values(storageFixtures))
      expect(JSON.parse(raw)).toBeInstanceOf(Array);
  });
});
