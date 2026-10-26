import { describe, expect, it } from "vitest";
import {
  bestHourIndex,
  conditionBands,
  describeConditions,
  isWet,
} from "./conditions";
const hour = (isDay: boolean | null, weatherCode: number | null) => ({
  isDay,
  weatherCode,
});
describe("timeline conditions", () => {
  it("treats precipitation and storms as wet, cloud and fog as dry", () => {
    expect([0, 2, 3, 45, null].map(isWet)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect([51, 61, 66, 71, 80, 86, 95].map(isWet)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });
  it("groups consecutive night and wet hours into bands", () => {
    const hours = [
      hour(false, 0),
      hour(false, 61),
      hour(true, 61),
      hour(true, 0),
      hour(null, 80),
      hour(false, null),
    ];
    expect(conditionBands(hours)).toEqual([
      { kind: "night", from: 0, to: 1 },
      { kind: "night", from: 5, to: 5 },
      { kind: "wet", from: 1, to: 2 },
      { kind: "wet", from: 4, to: 4 },
    ]);
    expect(conditionBands([])).toEqual([]);
  });
  it("describes an hour for the table", () => {
    expect(describeConditions(hour(true, 0))).toBe("Clear");
    expect(describeConditions(hour(false, 0))).toBe("Clear night");
    expect(describeConditions(hour(false, 61))).toBe("Rain · night");
    expect(describeConditions(hour(null, null))).toBe("Conditions unknown");
  });
  it("chooses the best hour, optionally only in dry daylight", () => {
    const effects = [
      { speedDeltaMps: 1 },
      null,
      { speedDeltaMps: 3 },
      { speedDeltaMps: 2 },
      { speedDeltaMps: 3 },
    ];
    const hours = [
      hour(true, 0),
      hour(true, 0),
      hour(false, 0),
      hour(true, 0),
      hour(true, 61),
    ];
    expect(bestHourIndex(effects, hours, false)).toBe(2);
    expect(bestHourIndex(effects, hours, true)).toBe(3);
    expect(bestHourIndex([null, null], hours, false)).toBe(-1);
    expect(bestHourIndex([{ speedDeltaMps: 1 }], [hour(null, 0)], true)).toBe(
      -1,
    );
  });
  it("lets the best hour fall in rain without the filter", () => {
    const effects = [
      { speedDeltaMps: 2 },
      { speedDeltaMps: 3 },
      { speedDeltaMps: 1 },
    ];
    const hours = [hour(false, 1), hour(true, 61), hour(true, 1)];
    expect(bestHourIndex(effects, hours, false)).toBe(1);
  });
});
