import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { defaultOpenMeteoConfig, recorded } from "@scout/testing";
import { openMeteoServer } from "@scout/testing/msw";
import {
  archiveLimits,
  dateRanges,
  loadArchiveWind,
  parseArchiveWind,
  splitDates,
  windAt,
} from "./archive-wind";

const config = defaultOpenMeteoConfig();
const server = openMeteoServer(config);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  config.faults.archive = "ok";
});
afterAll(() => server.close());
const signal = () => new AbortController().signal;
const point = [-0.12, 51.5];

describe("archive wind parsing", () => {
  it("reads a recorded two-day archive response into 48 usable hours", () => {
    const hours = parseArchiveWind(recorded().archive, "2026-09-01", 2);
    expect(hours).toHaveLength(48);
    expect(hours[0]!.at).toBe("2026-09-01T00:00:00.000Z");
    expect(
      hours.every((h) => h.speedMps !== null && h.fromDegrees !== null),
    ).toBe(true);
    expect(hours[47]!.at).toBe("2026-09-02T23:00:00.000Z");
  });
  it("rejects wrong units, wrong coverage and invalid values", () => {
    const fixture = recorded().archive;
    expect(() => parseArchiveWind(fixture, "2026-09-02", 2)).toThrow(
      "do not cover",
    );
    expect(() => parseArchiveWind(fixture, "2026-09-01", 1)).toThrow(
      "do not cover",
    );
    expect(() =>
      parseArchiveWind(
        {
          ...fixture,
          hourly_units: { ...fixture.hourly_units, time: "iso8601" },
        },
        "2026-09-01",
        2,
      ),
    ).toThrow("Unexpected archive units");
    expect(() =>
      parseArchiveWind(
        {
          ...fixture,
          hourly: {
            ...fixture.hourly,
            wind_speed_10m: fixture.hourly.wind_speed_10m!.map(() => -1),
          },
        },
        "2026-09-01",
        2,
      ),
    ).toThrow("Invalid archive value");
    expect(() => parseArchiveWind(null, "2026-09-01", 2)).toThrow(
      "Invalid archive response",
    );
    expect(() => parseArchiveWind(fixture, "1 Sep", 2)).toThrow(
      "Invalid archive range",
    );
  });
  it("keeps calm hours usable and missing direction unusable", () => {
    const fixture = recorded().archive;
    const speeds = [...fixture.hourly.wind_speed_10m!];
    const directions = [...fixture.hourly.wind_direction_10m!];
    speeds[0] = 0;
    directions[0] = null;
    speeds[1] = 3;
    directions[1] = null;
    const hours = parseArchiveWind(
      {
        ...fixture,
        hourly: {
          ...fixture.hourly,
          wind_speed_10m: speeds,
          wind_direction_10m: directions,
        },
      },
      "2026-09-01",
      2,
    );
    expect(hours[0]).toMatchObject({ speedMps: 0, fromDegrees: null });
    expect(hours[1]).toMatchObject({ speedMps: null, fromDegrees: null });
  });
});

describe("date ranges", () => {
  it("groups contiguous dates and splits at the request limit", () => {
    expect(
      dateRanges([
        "2026-09-03",
        "2026-09-01",
        "2026-09-02",
        "2026-09-02",
        "2026-09-10",
      ]),
    ).toEqual([
      { start: "2026-09-01", days: 3 },
      { start: "2026-09-10", days: 1 },
    ]);
    const run = Array.from(
      { length: archiveLimits.daysPerRequest + 1 },
      (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    );
    expect(dateRanges(run).map((r) => r.days)).toEqual([
      archiveLimits.daysPerRequest,
      1,
    ]);
    expect(dateRanges(["nope"])).toEqual([]);
  });
  it("splits more dates than one load allows into now and later", () => {
    const weekly = Array.from({ length: archiveLimits.requests + 5 }, (_, i) =>
      new Date(Date.UTC(2026, 0, 4) + i * 7 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    const split = splitDates([...weekly].reverse());
    expect(split.now).toEqual(weekly.slice(0, archiveLimits.requests));
    expect(split.later).toEqual(weekly.slice(archiveLimits.requests));
    expect(splitDates(["2026-09-02", "2026-09-01", "2026-09-01"])).toEqual({
      now: ["2026-09-01", "2026-09-02"],
      later: [],
    });
  });
  it("finds the hour containing an instant", () => {
    const hours = parseArchiveWind(recorded().archive, "2026-09-01", 2);
    expect(windAt(hours, "2026-09-01T09:42:10Z")?.at).toBe(
      "2026-09-01T09:00:00.000Z",
    );
    expect(windAt(hours, "2026-09-03T00:00:00Z")).toBeNull();
  });
});

describe("archive loading through fetch", () => {
  it("requires consent and at least one date", async () => {
    await expect(
      loadArchiveWind(
        { point, dates: ["2026-09-01"], consent: false },
        signal(),
        fetch,
      ),
    ).rejects.toThrow("Confirm sharing");
    await expect(
      loadArchiveWind({ point, dates: [], consent: true }, signal(), fetch),
    ).rejects.toThrow("No effort dates");
  });
  it("loads one request per contiguous range with the shared handler", async () => {
    config.archive = { speed: 6, direction: 90 };
    const result = await loadArchiveWind(
      {
        point,
        dates: ["2026-09-01", "2026-09-02", "2026-09-05"],
        consent: true,
      },
      signal(),
      fetch,
      new Date("2026-09-13T10:00:00Z"),
    );
    expect(result.hours).toHaveLength(72);
    expect(result.hours[0]).toMatchObject({
      at: "2026-09-01T00:00:00.000Z",
      speedMps: 6,
      fromDegrees: 90,
    });
    expect(result.retrievedAt).toBe("2026-09-13T10:00:00.000Z");
  });
  it("surfaces outages and rate limits with the documented messages", async () => {
    config.faults.archive = "outage";
    await expect(
      loadArchiveWind(
        { point, dates: ["2026-09-01"], consent: true },
        signal(),
        fetch,
      ),
    ).rejects.toThrow("Weather archive unavailable");
    config.faults.archive = "rateLimit";
    await expect(
      loadArchiveWind(
        { point, dates: ["2026-09-01"], consent: true },
        signal(),
        fetch,
      ),
    ).rejects.toThrow("rate limit");
  });
});
