import { describe, expect, it } from "vitest";
import { parseTarget, targetDifference } from "./attempt";
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
});
