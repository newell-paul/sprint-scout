import { expect, it } from "vitest";
import { analyzeCandidates } from "./wind";
import { syntheticProvenance as source, demoWeather } from "@scout/providers";
import { type Candidate, type Options, prepareGeometry } from "@scout/analysis";
const now = new Date("2026-09-07T12:00:00Z");
const options: Options = {
  startAt: "2026-09-08T16:00:00Z",
  endAt: "2026-09-08T18:00:00Z",
  timeZone: "Europe/London",
};
const hour = { ...demoWeather[0]!, gustMps: 7, precipitationProbabilityPct: 0 };
const candidate = (
  coordinates = [
    [0, 0],
    [0, 0.01],
  ],
): Candidate => ({
  segmentId: "north",
  source,
  geometry: { type: "LineString", coordinates },
  slots: [{ attemptAt: hour.validAt, weather: { scope: "segment", hour } }],
});
const run = (c = candidate(), o = options) => analyzeCandidates([c], o, now);
it("matches north/south/curved/weighted hand calculations and reversals", () => {
  expect(run().hourly[0]!.tailwindMps).toBeCloseTo(5, 8);
  const outAndBack = run(
    candidate([
      [0, 0],
      [0, 0.01],
      [0, 0],
    ]),
  ).hourly[0]!;
  expect(outAndBack.tailwindMps).toBeCloseTo(0, 8);
  expect(outAndBack.tailwindFraction).toBeCloseTo(0.5, 8);
  expect(outAndBack.worstHeadwindMps).toBeCloseTo(-5, 8);
  const weighted = run(
    candidate([
      [0, 0],
      [0, 0.02],
      [0, 0.01],
    ]),
  ).hourly[0]!;
  expect(weighted.tailwindMps).toBeCloseTo(5 / 3, 8);
  expect(weighted.tailwindFraction).toBeCloseTo(2 / 3, 8);
  expect(
    run(
      candidate([
        [0, 0.01],
        [0, 0],
      ]),
    ).hourly[0]!.tailwindMps,
  ).toBeCloseTo(-5, 8);
  const curved = run(
    candidate([
      [0, 0],
      [0, 0.01],
      [0.01, 0.01],
    ]),
  ).hourly[0]!;
  expect(curved.tailwindMps).toBeCloseTo(2.5, 5); // endpoint shortcut would be about 3.5355
  expect(curved.meanAbsCrosswindMps).toBeCloseTo(2.5, 5);
});
it("uses strict assistance and warning thresholds, incomplete fields and no gust assistance", () => {
  const c = candidate();
  c.slots[0]!.weather = {
    scope: "segment",
    hour: { ...hour, windSpeedMps: 0.5, gustMps: 7 },
  };
  const row = run(c, { ...options, thresholds: { gustMps: 7 } }).hourly[0]!;
  expect(row.tailwindFraction).toBe(0);
  expect(row.caution).toBe(false);
  expect(row.prediction).toBeNull();
  c.slots[0]!.weather = {
    scope: "segment",
    hour: { ...hour, gustMps: 8, precipitationMm: null },
  };
  const incomplete = run(c, { ...options, thresholds: { gustMps: 7 } })
    .hourly[0]!;
  expect(incomplete.warnings).toEqual(["GUST_THRESHOLD", "INCOMPLETE_WEATHER"]);
  expect(incomplete.tailwindMps).toBeCloseTo(5, 8);
  expect(incomplete.precipitationMm).toBeNull();
});
it("supports spatial leg weather, rejects gaps and preserves known cautions", () => {
  const c = candidate();
  const count = prepareGeometry(c.geometry).legs.length;
  const hours = Array.from({ length: count }, (_, i) => ({
    ...hour,
    windFromDegrees: i < count / 2 ? 180 : 0,
    gustMps: i === 0 ? 20 : null,
  }));
  c.slots[0]!.weather = { scope: "legs", hours };
  const row = run(c, { ...options, thresholds: { gustMps: 10 } }).hourly[0]!;
  expect(row.tailwindMps).toBeCloseTo(0, 8);
  expect(row.caution).toBe(true);
  expect(row.gustMps).toBeNull();
  c.slots[0]!.weather = { scope: "legs", hours: hours.slice(1) };
  expect(run(c).errors[0]!.code).toBe("FORECAST_UNAVAILABLE");
});
it("reports partial failures, missing wind, geometry and uncovered instants", () => {
  const bad = candidate();
  bad.segmentId = "missing";
  bad.slots[0]!.weather = {
    scope: "segment",
    hour: { ...hour, windSpeedMps: null },
  };
  const result = analyzeCandidates(
    [
      candidate(),
      bad,
      { ...candidate(), segmentId: "geometry", geometry: null },
    ],
    options,
    now,
  );
  expect(result.opportunities).toHaveLength(1);
  expect(result.errors.map((e) => e.code)).toEqual([
    "FORECAST_UNAVAILABLE",
    "GEOMETRY_INVALID",
  ]);
  bad.slots[0]!.attemptAt = options.endAt;
  expect(run(bad).errors[0]!.code).toBe("OUTSIDE_FORECAST_RANGE");
  expect(run({ ...candidate(), slots: [] }).errors[0]!.code).toBe(
    "FORECAST_UNAVAILABLE",
  );
});
it("enforces source permissions on geometry and all weather before output", () => {
  const c = candidate();
  c.source = { ...source, sourceKind: "strava-rest" };
  expect(run(c).errors[0]!.code).toBe("SOURCE_NOT_PERMITTED");
  expect(run(c).hourly).toEqual([]);
  c.source = source;
  c.slots[0]!.weather = {
    scope: "segment",
    hour: {
      ...hour,
      provenance: {
        ...source,
        policy: { ...source.policy, derivedOutputs: false },
      },
    },
  };
  const denied = run(c);
  expect(denied.hourly).toEqual([]);
  expect(denied.errors[0]!.code).toBe("SOURCE_NOT_PERMITTED");
});
it("filters selected segments and minimum assistance; keeps all valid hours and best per segment", () => {
  const c = candidate();
  c.slots.push({
    attemptAt: "2026-09-08T17:00:00Z",
    weather: {
      scope: "segment",
      hour: { ...hour, validAt: "2026-09-08T17:00:00Z", windSpeedMps: 6 },
    },
  });
  const result = run(c);
  expect(result.hourly).toHaveLength(2);
  // Both hours saturate the index at 100, so the documented UTC tie-break wins.
  expect(result.opportunities[0]!.attemptAt).toBe("2026-09-08T16:00:00Z");
  expect(run(c, { ...options, minTailwindMps: 5.5 }).hourly).toHaveLength(1);
  expect(run(c, { ...options, segmentIds: [] }).hourly).toEqual([]);
});

it("evaluates calm with null direction and rejects non-calm null direction", () => {
  const c = candidate();
  c.slots[0]!.weather = {
    scope: "segment",
    hour: { ...hour, windSpeedMps: 0, windFromDegrees: null },
  };
  expect(run(c).hourly[0]!.tailwindMps).toBe(0);
  c.slots[0]!.weather = {
    scope: "segment",
    hour: { ...hour, windSpeedMps: 1, windFromDegrees: null },
  };
  expect(run(c).errors[0]!.code).toBe("FORECAST_UNAVAILABLE");
});
it("places crosswind and rain breaches in caution and propagates source restrictions", () => {
  const c = candidate();
  c.slots[0]!.weather = {
    scope: "segment",
    hour: { ...hour, windFromDegrees: 270, precipitationMm: 2 },
  };
  const row = run(c, {
    ...options,
    thresholds: { crosswindMps: 4, precipitationMm: 1 },
  }).hourly[0]!;
  expect(row.warnings).toEqual(["CROSSWIND_THRESHOLD", "RAIN_THRESHOLD"]);
  expect(row.caution).toBe(true);
  expect(row.sources).toContainEqual(source);
  expect(
    run(c, { ...options, thresholds: { crosswindMps: 5, precipitationMm: 2 } })
      .hourly[0]!.caution,
  ).toBe(false);
});
it("bounds hourly entries and rejects mismatched coverage", () => {
  const c = candidate();
  c.slots[0]!.weather = {
    scope: "segment",
    hour: { ...hour, validAt: "2026-09-08T17:00:00Z" },
  };
  expect(run(c).errors[0]!.code).toBe("OUTSIDE_FORECAST_RANGE");
  c.slots = Array.from({ length: 49 }, () => c.slots[0]!);
  expect(() => run(c)).toThrow();
});
