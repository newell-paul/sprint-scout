import { describe, expect, it } from "vitest";
import { openMeteoForecastResponse } from "@scout/contracts";
import {
  defaultOpenMeteoConfig,
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
  });
  it("expose msw handlers for every endpoint", () => {
    expect(openMeteoHandlers().map((h) => h.info.header)).toEqual([
      "GET https://api.open-meteo.com/v1/forecast",
    ]);
  });
  it("carry recorded storage shapes as strings", () => {
    for (const raw of Object.values(storageFixtures))
      expect(JSON.parse(raw)).toBeInstanceOf(Array);
  });
});
