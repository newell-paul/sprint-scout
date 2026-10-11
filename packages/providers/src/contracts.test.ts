import { it, expect } from "vitest";
import { utcInstant, coordinate, weatherHour } from "@scout/contracts";
import { demoWeather, demoSegments, demoEfforts } from "./index";
it("uses bounded longitude/latitude and explicit UTC", () => {
  expect(coordinate.safeParse([181, 51]).success).toBe(false);
  for (const value of ["2026-09-07T12:00:00", "2026-09-07T12:00:00+01:00"])
    expect(utcInstant.safeParse(value).success).toBe(false);
});
it("keeps missing weather null and validates deterministic fixtures", () => {
  expect(demoSegments).toHaveLength(2);
  expect(demoEfforts).toHaveLength(1);
  expect(weatherHour.parse(demoWeather[0]).gustMps).toBeNull();
  expect(
    weatherHour.safeParse({ ...demoWeather[0], windSpeedMps: -1 }).success,
  ).toBe(false);
});
