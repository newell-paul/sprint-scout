import { describe, it, expect, vi } from "vitest";
import { requirePermission, withPermittedSources } from "./index";
import { syntheticProvenance as p } from "@scout/providers";
const now = new Date("2026-09-07T12:00:00Z");
describe("source boundary", () => {
  for (const operation of [
    "analysis",
    "persistence",
    "derivedOutputs",
    "aiDisclosure",
  ] as const) {
    it(`allows registered synthetic ${operation}`, () =>
      expect(() => requirePermission(p, operation, now)).not.toThrow());
    it(`denies explicit ${operation} restriction before execution`, () => {
      const action = vi.fn();
      expect(() =>
        withPermittedSources(
          [{ ...p, policy: { ...p.policy, [operation]: false } }],
          operation,
          now,
          action,
        ),
      ).toThrow("not permitted");
      expect(action).not.toHaveBeenCalled();
    });
  }
  for (const sourceKind of [
    "strava-rest",
    "strava-export",
    "independent",
    "open-meteo",
    "unknown",
  ]) {
    it(`denies forged permissions for ${sourceKind}`, () => {
      for (const operation of ["analysis", "aiDisclosure"] as const) {
        const action = vi.fn();
        expect(() =>
          withPermittedSources(
            [p, { ...p, sourceKind }],
            operation,
            now,
            action,
          ),
        ).toThrow();
        expect(action).not.toHaveBeenCalled();
      }
    });
  }
  it("denies missing, unknown, expired and empty provenance", () => {
    for (const value of [
      undefined,
      {},
      { ...p, sourceId: "unknown" },
      { ...p, expiresAt: now.toISOString().replace(".000", "") },
    ])
      expect(() => requirePermission(value, "analysis", now)).toThrow();
    expect(() =>
      withPermittedSources([], "aiDisclosure", now, () => "output"),
    ).toThrow();
  });
});
