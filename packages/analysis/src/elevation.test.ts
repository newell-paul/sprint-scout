import { describe, expect, it } from "vitest";
import { elevationProfile } from "./elevation";
import type { LonLat } from "./track-stretch";

const north = (n: number): LonLat[] =>
  Array.from({ length: n }, (_, i) => [-0.12, 51.5 + i * 0.0001]);

describe("elevationProfile", () => {
  it("measures distance along the points and summarises the heights", () => {
    const profile = elevationProfile(north(4), [14.4, 10.1, 13, 12.4]);
    expect(profile.distancesM[0]).toBe(0);
    expect(profile.distancesM[3]).toBeCloseTo(33.36, 1);
    expect(profile).toMatchObject({
      startM: 14.4,
      finishM: 12.4,
      lowestM: 10.1,
      highestM: 14.4,
    });
    expect(profile.netM).toBeCloseTo(-2, 10);
  });
  it("reports a rise as a positive net change", () => {
    expect(elevationProfile(north(2), [10, 15]).netM).toBe(5);
  });
  it.each([
    ["fewer heights than points", north(3), [1, 2]],
    ["more heights than points", north(2), [1, 2, 3]],
    ["a single point", north(1), [1]],
  ])("refuses %s", (_, points, heights) => {
    expect(() => elevationProfile(points, heights)).toThrow(
      "Elevation needs one height for each of at least two points.",
    );
  });
});
