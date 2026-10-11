import { describe, expect, it } from "vitest";
import {
  parseTarget,
  targetDifference,
  validAvailability,
  withinAvailability,
} from "./attempt";
import { bestHourIndex } from "../components/conditions";
import { readLibrary } from "./library";

describe("attempt preferences", () => {
  it("validates targets without changing legacy libraries", () => {
    expect(parseTarget("1:30")).toBe(90);
    expect(parseTarget("1440:00")).toBe(86400);
    for (const value of ["", "90", "1:60", "-1:20", "0:00", "1440:01"])
      expect(parseTarget(value)).toBeNull();
    expect(targetDifference(87, 90)).toBe("Estimate 3s inside target");
    expect(targetDifference(94, 90)).toBe("Estimate 4s outside target");
    expect(targetDifference(90.4, 90)).toContain("matches");
    expect(targetDifference(null, 90)).toContain("unavailable");
    const route = {
      id: "test",
      name: "Test",
      confirmed: true,
      createdAt: "2026-09-10T00:00:00Z",
      points: [
        [0, 0],
        [0, 0.01],
      ],
    };
    expect(readLibrary(JSON.stringify([route]))[0]?.slot).toBe(0);
    expect(
      readLibrary(JSON.stringify([{ ...route, targetTimeS: 90 }]))[0]
        ?.targetTimeS,
    ).toBe(90);
    for (const targetTimeS of [0, -1, 1.5, 86401, "90"])
      expect(() =>
        readLibrary(JSON.stringify([{ ...route, targetTimeS }])),
      ).toThrow();
  });
  it("uses local dates, excludes the end and supports overnight windows", () => {
    const window = {
      from: "2026-09-10T23:00",
      until: "2026-09-11T01:00",
      timeZone: "Europe/London",
    };
    expect(withinAvailability("2026-09-10T22:00:00Z", window)).toBe(true);
    expect(withinAvailability("2026-09-11T00:00:00Z", window)).toBe(false);
    expect(withinAvailability("2026-09-10T21:00:00Z", window)).toBe(false);
    expect(validAvailability({ ...window, from: "2026-02-30T10:00" })).toBe(
      false,
    );
    expect(validAvailability({ ...window, until: window.from })).toBe(false);
    expect(withinAvailability("invalid", window)).toBe(false);
  });
  it("includes both repeated hours and does not invent spring-gap instants", () => {
    const window = {
      from: "2026-10-25T01:00",
      until: "2026-10-25T02:00",
      timeZone: "Europe/London",
    };
    expect(withinAvailability("2026-10-25T00:00:00Z", window)).toBe(true);
    expect(withinAvailability("2026-10-25T01:00:00Z", window)).toBe(true);
    expect(
      withinAvailability("2026-03-29T01:00:00Z", {
        ...window,
        from: "2026-03-29T01:00",
        until: "2026-03-29T02:00",
      }),
    ).toBe(false);
  });
  it("combines availability, dry daylight, missing wind and earliest ties", () => {
    const window = {
      from: "2026-09-10T10:00",
      until: "2026-09-10T13:00",
      timeZone: "UTC",
    };
    const hours = [
      { isDay: true, weatherCode: 0 },
      { isDay: true, weatherCode: 61 },
      { isDay: true, weatherCode: 0 },
    ];
    const instants = [
      "2026-09-10T09:00:00Z",
      "2026-09-10T10:00:00Z",
      "2026-09-10T11:00:00Z",
    ];
    const effects = [
      { speedDeltaMps: 5 },
      { speedDeltaMps: 2 },
      { speedDeltaMps: 2 },
    ];
    expect(bestHourIndex(effects, hours, false, window, instants)).toBe(1);
    expect(bestHourIndex(effects, hours, true, window, instants)).toBe(2);
    expect(
      bestHourIndex([null, null, null], hours, false, window, instants),
    ).toBe(-1);
    expect(
      bestHourIndex(
        effects,
        hours,
        false,
        { ...window, from: "2026-09-11T10:00", until: "2026-09-11T13:00" },
        instants,
      ),
    ).toBe(-1);
  });
});
