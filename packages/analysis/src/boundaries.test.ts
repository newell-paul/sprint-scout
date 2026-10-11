import { describe, expect, it } from "vitest";
import {
  evaluateHour,
  prepareGeometry,
  projectWind,
  rankOpportunities,
  validateOptions,
  weatherIndex,
  type Candidate,
  type Opportunity,
  type Options,
} from "./index";
import {
  estimateRideEffect,
  referenceRider,
  solveSpeedMps,
} from "./ride-effect";
import { estimateTerrainEffect, solveTerrainSpeedMps } from "./terrain-effect";
import type { Provenance } from "@scout/contracts";

// Exact-boundary tests. Each pair sits one step either side of a limit so a
// mutated comparison operator or dropped condition fails here.
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
const line = (coordinates: number[][]) => ({ type: "LineString", coordinates });
const north = line([
  [0, 51],
  [0, 51.0009],
]);
const options: Options = {
  startAt: "2026-09-10T09:00:00Z",
  endAt: "2026-09-10T12:00:00Z",
  timeZone: "Europe/London",
};
const hour = (
  overrides: Partial<Parameters<typeof evaluateHour>[1][number]> = {},
) => ({
  validAt: "2026-09-10T09:00:00Z",
  windSpeedMps: 4,
  windFromDegrees: 180,
  gustMps: 6,
  precipitationMm: 0,
  precipitationProbabilityPct: 10,
  temperatureC: 15,
  provenance: source,
  ...overrides,
});
const evaluate = (
  hours: ReturnType<typeof hour>[],
  extra: Partial<Options> = {},
) => {
  const geometry = prepareGeometry(north);
  const padded = geometry.legs.map((_, i) => hours[i] ?? hours[0]!);
  return evaluateHour(geometry, padded, "north", source, {
    ...options,
    ...extra,
  });
};
const candidate = (segmentId = "s", slots = 1): Candidate => ({
  segmentId,
  geometry: north,
  source,
  slots: Array.from({ length: slots }, (_, i) => ({
    attemptAt: new Date(Date.UTC(2026, 8, 10, 9 + i)).toISOString(),
    weather: { scope: "segment" as const, hour: hour() },
  })),
});
const row = (overrides: Partial<Opportunity>): Opportunity => ({
  ...evaluate([hour()]),
  ...overrides,
});

describe("geometry limits", () => {
  it.each([1, 100])("accepts a sampling distance of %s m", (maxLegM) => {
    expect(prepareGeometry(north, maxLegM).legs.length).toBeGreaterThan(0);
  });
  it.each([0.999, 100.001])(
    "rejects a sampling distance of %s m",
    (maxLegM) => {
      expect(() => prepareGeometry(north, maxLegM)).toThrow(
        "Expected a bounded directed LineString and sampling distance from 1 to 100 m",
      );
    },
  );
  it("accepts 2000 sampled legs and rejects 2001", () => {
    expect(
      prepareGeometry(
        line([
          [0, 0],
          [0, 1.7986],
        ]),
      ).legs,
    ).toHaveLength(2000);
    expect(() =>
      prepareGeometry(
        line([
          [0, 0],
          [0, 1.7988],
        ]),
      ),
    ).toThrow("Sampled geometry exceeds 2000 legs");
  });
  it("ignores repeated and sub-micron points without changing the legs", () => {
    const clean = prepareGeometry(north);
    const noisy = prepareGeometry(
      line([
        [0, 51],
        [0, 51],
        [1e-13, 51],
        [0, 51.0009],
      ]),
    );
    expect(noisy.legs.length).toBe(clean.legs.length);
    expect(noisy.lengthM).toBeCloseTo(clean.lengthM, 6);
    expect(() =>
      prepareGeometry(
        line([
          [0, 51],
          [0, 51],
        ]),
      ),
    ).toThrow("Geometry has no nonzero legs");
  });
  it("samples so that no leg exceeds the requested distance", () => {
    const legs = prepareGeometry(
      line([
        [0, 51],
        [0, 51.0027],
      ]),
      100,
    ).legs;
    expect(legs).toHaveLength(4);
    expect(Math.max(...legs.map((l) => l.distanceM))).toBeLessThanOrEqual(100);
  });
});

describe("wind input limits", () => {
  it("accepts a direction just under 360 and rejects 360, negatives and NaN", () => {
    expect(projectWind(5, 359.999, 0).tailwindMps).toBeCloseTo(-5, 3);
    for (const from of [360, -0.001, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => projectWind(5, from, 0)).toThrow(
        "Valid wind speed and direction are required unless calm",
      );
    expect(() => projectWind(5, 0, Number.NaN)).toThrow();
  });
  it("rejects non-finite index configuration", () => {
    expect(() => weatherIndex(Number.NaN)).toThrow(
      "Invalid index configuration",
    );
    expect(() =>
      weatherIndex(0, { offsetMps: Number.NaN, spanMps: 1 }),
    ).toThrow();
    expect(() => weatherIndex(0, { offsetMps: 0, spanMps: -1 })).toThrow();
  });
});

describe("hour evaluation", () => {
  it("requires exactly one observation per leg", () => {
    const geometry = prepareGeometry(north);
    expect(() => evaluateHour(geometry, [], "n", source, options)).toThrow(
      "Weather coverage must match every leg",
    );
    expect(() =>
      evaluateHour(
        geometry,
        [...geometry.legs, geometry.legs[0]!].map(() => hour()),
        "n",
        source,
        options,
      ),
    ).toThrow("Weather coverage must match every leg");
  });
  it.each([
    ["gustMps", { gustMps: 12 }, { gustMps: 12.001 }, "GUST_THRESHOLD"],
    [
      "precipitationMm",
      { precipitationMm: 1 },
      { precipitationMm: 1.001 },
      "RAIN_THRESHOLD",
    ],
  ] as const)("warns only above the %s threshold", (_, at, above, warning) => {
    const thresholds = { gustMps: 12, precipitationMm: 1 };
    expect(evaluate([hour(at)], { thresholds }).warnings).not.toContain(
      warning,
    );
    const breached = evaluate([hour(above)], { thresholds });
    expect(breached.warnings).toContain(warning);
    expect(breached.caution).toBe(true);
  });
  it("warns only above the crosswind threshold", () => {
    const cross = hour({ windSpeedMps: 6, windFromDegrees: 90 });
    const at = evaluate([cross], { thresholds: { crosswindMps: 6 } });
    const above = evaluate([cross], { thresholds: { crosswindMps: 5.999 } });
    expect(at.warnings).not.toContain("CROSSWIND_THRESHOLD");
    expect(above.warnings).toContain("CROSSWIND_THRESHOLD");
    expect(at.caution).toBe(false);
  });
  it("keeps a breach from one leg when another leg is missing that field", () => {
    const result = evaluate([hour({ gustMps: 20 }), hour({ gustMps: null })], {
      thresholds: { gustMps: 12 },
    });
    expect(result.warnings).toEqual(["GUST_THRESHOLD", "INCOMPLETE_WEATHER"]);
    expect(result.gustMps).toBeNull();
    expect(result.caution).toBe(true);
  });
  it.each([
    "gustMps",
    "precipitationMm",
    "precipitationProbabilityPct",
    "temperatureC",
  ] as const)(
    "marks the hour incomplete when %s is missing on any leg",
    (field) => {
      const result = evaluate([hour(), hour({ [field]: null })]);
      expect(result.dataQuality).toBe("incomplete");
      expect(result.warnings).toEqual(["INCOMPLETE_WEATHER"]);
      expect(result.caution).toBe(false);
    },
  );
  it("reports the maximum per field and complete quality when every leg is present", () => {
    const result = evaluate([
      hour({
        gustMps: 6,
        precipitationMm: 0.2,
        precipitationProbabilityPct: 10,
      }),
      hour({
        gustMps: 9,
        precipitationMm: 0.1,
        precipitationProbabilityPct: 40,
      }),
    ]);
    expect(result.dataQuality).toBe("complete");
    expect(result.warnings).toEqual([]);
    expect([
      result.gustMps,
      result.precipitationMm,
      result.precipitationProbabilityPct,
    ]).toEqual([9, 0.2, 40]);
  });
  it("uses the earliest retrieval time and deduplicates identical sources", () => {
    const older = { ...source, retrievedAt: "2026-09-10T05:00:00Z" };
    const result = evaluate([hour(), hour({ provenance: older }), hour()]);
    expect(result.retrievedAt).toBe("2026-09-10T05:00:00Z");
    expect(result.sources).toEqual([source, source, older]);
    expect(result.rideEffect.band?.leadHours).toBe(4);
  });
  it("counts assisted distance only where tailwind exceeds half a metre per second", () => {
    expect(evaluate([hour({ windSpeedMps: 0.49 })]).tailwindFraction).toBe(0);
    expect(evaluate([hour({ windSpeedMps: 0.51 })]).tailwindFraction).toBe(1);
    expect(
      evaluate([hour({ windSpeedMps: 3, windFromDegrees: 0 })])
        .worstHeadwindMps,
    ).toBeCloseTo(-3, 6);
    expect(evaluate([hour({ windSpeedMps: 3 })]).worstHeadwindMps).toBe(0);
  });
});

describe("ranking limits and tie-breaks", () => {
  const base = evaluate([hour()]);
  it("accepts a limit of 50 and rejects 0 and 51", () => {
    expect(rankOpportunities([base], 50)).toHaveLength(1);
    for (const limit of [0, 51, 1.5])
      expect(() => rankOpportunities([base], limit)).toThrow(
        "Ranking bounds exceeded",
      );
  });
  it("accepts 2400 rows and rejects 2401", () => {
    const rows = Array.from({ length: 2400 }, (_, i) =>
      row({ segmentId: `s${i % 50}`, attemptAt: `h${i}` }),
    );
    expect(rankOpportunities(rows, 50)).toHaveLength(50);
    expect(() => rankOpportunities([...rows, base])).toThrow(
      "Ranking bounds exceeded",
    );
  });
  it("orders by caution, index, crosswind, rain, hour then id and keeps one row per segment", () => {
    const calm = { caution: false, weatherIndex: 70, meanAbsCrosswindMps: 0 };
    const rows = [
      row({ segmentId: "b", attemptAt: "2", ...calm, meanAbsCrosswindMps: 1 }),
      row({ segmentId: "a", attemptAt: "1", caution: true, weatherIndex: 100 }),
      row({ segmentId: "c", attemptAt: "1", ...calm, precipitationMm: 0 }),
      row({ segmentId: "b", attemptAt: "1", ...calm, precipitationMm: null }),
      row({ segmentId: "d", attemptAt: "1", ...calm, precipitationMm: 0.5 }),
      row({ segmentId: "e", attemptAt: "1", ...calm, precipitationMm: 0.5 }),
      row({ segmentId: "e", attemptAt: "0", ...calm, precipitationMm: 0.5 }),
    ];
    expect(
      rankOpportunities(rows, 50).map((r) => `${r.segmentId}@${r.attemptAt}`),
    ).toEqual(["c@1", "e@0", "d@1", "b@1", "a@1"]);
    expect(rankOpportunities(rows, 2).map((r) => r.segmentId)).toEqual([
      "c",
      "e",
    ]);
  });
});

describe("batch option validation", () => {
  const ok = (extra: Partial<Options> = {}, candidates = [candidate()]) =>
    validateOptions({ ...options, ...extra }, candidates);
  it("accepts a 48 hour window and rejects 48 hours plus one second, empty and reversed windows", () => {
    expect(() => ok({ endAt: "2026-09-12T09:00:00Z" })).not.toThrow();
    for (const endAt of [
      "2026-09-12T09:00:01Z",
      options.startAt,
      "2026-09-10T08:00:00Z",
    ])
      expect(() => ok({ endAt })).toThrow("Invalid or excessive batch/window");
    expect(() => ok({ startAt: "2026-09-10T09:00:00" })).toThrow(
      "Invalid or excessive batch/window",
    );
  });
  it("accepts 50 distinct candidates with 48 slots and rejects 51, 49 slots, duplicates and blank ids", () => {
    const fifty = Array.from({ length: 50 }, (_, i) => candidate(`s${i}`, 48));
    expect(() => ok({}, fifty)).not.toThrow();
    expect(() => ok({}, [...fifty, candidate("extra")])).toThrow();
    expect(() => ok({}, [candidate("s", 49)])).toThrow();
    expect(() => ok({}, [candidate("s"), candidate("s")])).toThrow();
    expect(() => ok({}, [candidate("")])).toThrow();
    const repeated = candidate("s", 2);
    repeated.slots[1]!.attemptAt = repeated.slots[0]!.attemptAt;
    expect(() => ok({}, [repeated])).toThrow();
    expect(() =>
      ok({ segmentIds: Array.from({ length: 50 }, (_, i) => `s${i}`) }),
    ).not.toThrow();
    expect(() =>
      ok({ segmentIds: Array.from({ length: 51 }, (_, i) => `s${i}`) }),
    ).toThrow();
  });
  it("rejects an invalid display zone, negative thresholds and a non-finite filter", () => {
    expect(() => ok({ timeZone: "Mars/Olympus" })).toThrow(
      "Invalid display time zone",
    );
    expect(() => ok({ thresholds: { gustMps: -0.001 } })).toThrow(
      "Invalid warning threshold",
    );
    expect(() => ok({ thresholds: { gustMps: 0 } })).not.toThrow();
    expect(() => ok({ minTailwindMps: Number.NaN })).toThrow("Invalid filter");
    expect(() => ok({ minTailwindMps: -2 })).not.toThrow();
    expect(() => ok({ indexConfig: { offsetMps: 0, spanMps: 0 } })).toThrow(
      "Invalid index configuration",
    );
    expect(() => ok({ limit: 51 })).toThrow("Ranking bounds exceeded");
  });
});

describe("rider physics limits", () => {
  it("clamps wind to ±30 m/s in both directions", () => {
    expect(solveSpeedMps(-100)).toBe(solveSpeedMps(-30));
    expect(solveSpeedMps(-29.999)).toBeGreaterThan(solveSpeedMps(-30));
  });
  it("ignores unusable legs and refuses a route with none", () => {
    const only = estimateRideEffect([{ distanceM: 1000, tailwindMps: 3 }]);
    const padded = estimateRideEffect([
      { distanceM: 0, tailwindMps: -20 },
      { distanceM: Number.NaN, tailwindMps: -20 },
      { distanceM: 1000, tailwindMps: Number.NaN },
      { distanceM: 1000, tailwindMps: 3 },
    ]);
    expect(padded.timeDeltaS).toBe(only.timeDeltaS);
    expect(() =>
      estimateRideEffect([{ distanceM: 0, tailwindMps: 1 }]),
    ).toThrow("Ride effect needs legs");
    expect(
      estimateRideEffect([{ distanceM: 1000, tailwindMps: 3 }], undefined, {
        leadHours: Number.NaN,
      }).band,
    ).toBeNull();
    const negative = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 3 }],
      undefined,
      { leadHours: -1 },
    );
    const positive = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 3 }],
      undefined,
      { leadHours: 1 },
    );
    expect(negative.band).toBeNull();
    expect(positive.band?.leadHours).toBe(1);
  });
  it("copies the rider into the result", () => {
    const rider = { ...referenceRider };
    const result = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 0 }],
      rider,
    );
    expect(result.rider).toEqual(rider);
    expect(result.rider).not.toBe(rider);
    const terrain = estimateTerrainEffect(
      [{ distanceM: 1000, tailwindMps: 0, grade: 0 }],
      rider,
    );
    expect(terrain.rider).toEqual(rider);
    expect(terrain.rider).not.toBe(rider);
  });
});

describe("terrain physics limits", () => {
  it.each([
    ["mass", { massKg: 0 }],
    ["drag area", { cdaM2: 0 }],
    ["air density", { airDensity: 0 }],
    ["rolling resistance", { crr: -0.001 }],
    ["non-finite mass", { massKg: Number.NaN }],
  ])("rejects a rider with invalid %s", (_, patch) => {
    expect(() =>
      solveTerrainSpeedMps(300, 0, 0, { ...referenceRider, ...patch }),
    ).toThrow("Terrain model inputs are outside supported limits.");
  });
  it("accepts grade and wind exactly at the limits and rejects just beyond", () => {
    expect(solveTerrainSpeedMps(300, 30, 0.3)).toBeGreaterThan(0);
    expect(
      solveTerrainSpeedMps(300, -30, -0.3, { ...referenceRider, massKg: 40 }),
    ).toBeGreaterThan(0);
    expect(() => solveTerrainSpeedMps(300, 30.001, 0)).toThrow();
    expect(() => solveTerrainSpeedMps(300, 0, -0.3001)).toThrow();
    expect(() => solveTerrainSpeedMps(1000, 30, -0.3)).toThrow(
      "Terrain speed exceeds the model limit of 144 km/h.",
    );
  });
  it("is slower uphill than on the flat and faster with the grade component removed", () => {
    const flat = solveTerrainSpeedMps(300, 0, 0);
    expect(solveTerrainSpeedMps(300, 0, 0.05)).toBeLessThan(flat);
    expect(solveTerrainSpeedMps(300, 0, -0.05)).toBeGreaterThan(flat);
    expect(solveTerrainSpeedMps(300, 0, 0)).toBeCloseTo(
      solveSpeedMps(0, { ...referenceRider, calmSpeedKmh: flat * 3.6 }),
      6,
    );
  });
  it.each([
    ["no legs", []],
    ["zero distance", [{ distanceM: 0, tailwindMps: 0, grade: 0 }]],
    [
      "non-finite wind",
      [{ distanceM: 100, tailwindMps: Number.NaN, grade: 0 }],
    ],
    [
      "non-finite crosswind",
      [{ distanceM: 100, tailwindMps: 0, crosswindMps: Number.NaN, grade: 0 }],
    ],
    ["grade over 30%", [{ distanceM: 100, tailwindMps: 0, grade: 0.31 }]],
  ])("rejects terrain legs with %s", (_, legs) => {
    expect(() => estimateTerrainEffect(legs)).toThrow(
      "Complete valid terrain legs are required.",
    );
  });
  it("projects the along-route wind onto the slope", () => {
    const steep = estimateTerrainEffect([
      { distanceM: 1000, tailwindMps: 8, grade: 0.3 },
    ]);
    const flat = estimateTerrainEffect([
      { distanceM: 1000, tailwindMps: 8, grade: 0 },
    ]);
    expect(steep.windSpeedMps).toBeLessThan(flat.windSpeedMps);
    expect(steep.calmSpeedMps).toBeLessThan(flat.calmSpeedMps);
    expect(
      estimateTerrainEffect(
        [{ distanceM: 1000, tailwindMps: 8, grade: 0 }],
        referenceRider,
        Number.NaN,
      ).band,
    ).toBeNull();
    const band = estimateTerrainEffect(
      [{ distanceM: 1000, tailwindMps: 8, grade: 0.02 }],
      referenceRider,
      6,
    ).band!;
    expect(band.leadHours).toBe(6);
    expect(band.speedDeltaHighMps).toBeGreaterThan(band.speedDeltaLowMps);
  });
});
