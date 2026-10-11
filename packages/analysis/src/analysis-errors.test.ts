import { describe, expect, it } from "vitest";
import { evaluateHour, prepareGeometry } from "./index";
import type { Provenance } from "@scout/contracts";

const source: Provenance = {
  sourceKind: "synthetic",
  sourceId: "demo-v1",
  retrievedAt: "2026-09-10T06:00:00Z",
  expiresAt: null,
  policy: {
    analysis: true,
    persistence: true,
    derivedOutputs: true,
    aiDisclosure: true,
    decisionId: "synthetic-v1",
  },
};
const hour = (validAt: string) => ({
  validAt,
  windSpeedMps: 4,
  windFromDegrees: 180,
  gustMps: 6,
  precipitationMm: 0,
  precipitationProbabilityPct: 0,
  temperatureC: 15,
  provenance: source,
});
const line = {
  type: "LineString",
  coordinates: [
    [0, 51],
    [0, 51.0015],
  ],
};

describe("analysis error codes", () => {
  it("rejects a sampling distance outside 1 to 100 m", () => {
    for (const maxLegM of [0, 101, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => prepareGeometry(line, maxLegM)).toThrow(
        expect.objectContaining({ code: "GEOMETRY_INVALID" }),
      );
  });
  it("rejects leg observations that do not share the attempt hour", () => {
    const geometry = prepareGeometry(line);
    const hours = geometry.legs.map((_, i) =>
      hour(i === 0 ? "2026-09-10T09:00:00Z" : "2026-09-10T10:00:00Z"),
    );
    expect(() =>
      evaluateHour(geometry, hours, "s", source, {
        startAt: "2026-09-10T09:00:00Z",
        endAt: "2026-09-10T12:00:00Z",
        timeZone: "UTC",
      }),
    ).toThrow(expect.objectContaining({ code: "OUTSIDE_FORECAST_RANGE" }));
  });
});
