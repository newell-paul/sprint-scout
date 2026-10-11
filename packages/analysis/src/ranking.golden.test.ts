import { describe, expect, it } from "vitest";
import {
  evaluateHour,
  prepareGeometry,
  rankOpportunities,
  type Opportunity,
} from "./index";
import type { Provenance } from "@scout/contracts";

// Recorded inputs and expected outputs. Review a changed fixture like a
// snapshot: a diff here means the ranking or the numbers changed on purpose.
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
function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
const row = (
  segmentId: string,
  hourIndex: number,
  random: () => number,
): Opportunity => {
  const tailwindMps = Math.round((random() * 16 - 8) * 100) / 100;
  const precipitation = random();
  return {
    algorithmVersion: "wind-v1",
    segmentId,
    attemptAt: `2026-09-10T${String(9 + hourIndex).padStart(2, "0")}:00:00Z`,
    timeZone: "Europe/London",
    tailwindMps,
    meanAbsCrosswindMps: Math.round(random() * 600) / 100,
    maxAbsCrosswindMps: 8,
    worstHeadwindMps: Math.min(0, tailwindMps),
    tailwindFraction: tailwindMps > 0.5 ? 1 : 0,
    gustMps: null,
    precipitationMm:
      precipitation < 0.25
        ? null
        : Math.round((precipitation - 0.25) * 400) / 100,
    precipitationProbabilityPct: null,
    weatherIndex:
      Math.round(Math.max(0, Math.min(1, (tailwindMps + 5) / 10)) * 1000) / 10,
    indexConfig: { offsetMps: 5, spanMps: 10 },
    warnings: [],
    caution: random() < 0.2,
    dataQuality: "complete",
    retrievedAt: source.retrievedAt,
    sources: [source],
    prediction: null,
    predictionReason: "",
    limitations: "",
    rideEffect: {
      version: "ride-effect-v1",
      riderHeightFactor: 0.67,
      calmSpeedMps: 11.11,
      windSpeedMps: 11.11,
      speedDeltaMps: 0,
      timeDeltaS: 0,
      band: null,
      rider: {
        calmSpeedKmh: 40,
        cdaM2: 0.36,
        crr: 0.005,
        massKg: 85,
        airDensity: 1.225,
      },
    },
    legs: [],
  };
};
const round = (value: unknown): unknown =>
  typeof value === "number"
    ? Math.round(value * 1e6) / 1e6
    : Array.isArray(value)
      ? value.map(round)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, round(v)]),
          )
        : value;

describe("golden ranking", () => {
  it("orders recorded opportunities exactly as the committed fixture", async () => {
    const random = lcg(20260910);
    const rows = ["hill", "bend", "north", "quay", "loop"].flatMap((id) =>
      Array.from({ length: 8 }, (_, hour) => row(id, hour, random)),
    );
    const key = (o: Opportunity) => `${o.segmentId}@${o.attemptAt}`;
    const recorded = {
      input: rows.map((o) => ({
        key: key(o),
        caution: o.caution,
        weatherIndex: o.weatherIndex,
        meanAbsCrosswindMps: o.meanAbsCrosswindMps,
        precipitationMm: o.precipitationMm,
      })),
      expected: Object.fromEntries(
        [1, 3, 5].map((limit) => [
          `limit ${limit}`,
          rankOpportunities(rows, limit).map(key),
        ]),
      ),
    };
    await expect(JSON.stringify(recorded, null, 2) + "\n").toMatchFileSnapshot(
      "../fixtures/ranking.golden.json",
    );
  });
  it("evaluates a recorded hour exactly as the committed fixture", async () => {
    const geometry = prepareGeometry({
      type: "LineString",
      coordinates: [
        [-0.1, 51.5],
        [-0.098, 51.5012],
        [-0.095, 51.5013],
      ],
    });
    const random = lcg(7);
    const hours = geometry.legs.map(() => ({
      validAt: "2026-09-10T09:00:00Z",
      windSpeedMps: Math.round(random() * 1200) / 100,
      windFromDegrees: Math.round(random() * 35999) / 100,
      gustMps: Math.round(random() * 2000) / 100,
      precipitationMm: Math.round(random() * 200) / 100,
      precipitationProbabilityPct: Math.round(random() * 100),
      temperatureC: 14,
      provenance: source,
    }));
    const result = evaluateHour(geometry, hours, "recorded", source, {
      startAt: "2026-09-10T09:00:00Z",
      endAt: "2026-09-10T12:00:00Z",
      timeZone: "Europe/London",
      thresholds: { gustMps: 12, crosswindMps: 6, precipitationMm: 1 },
    });
    await expect(
      JSON.stringify(round(result), null, 2) + "\n",
    ).toMatchFileSnapshot("../fixtures/evaluate-hour.golden.json");
  });
});
