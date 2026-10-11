import { z } from "zod";
export const contractVersion = "1" as const;
export const utcInstant = z.iso.datetime({ precision: 0 });
export const sourceKind = z.enum([
  "synthetic",
  "independent",
  "strava-rest",
  "strava-export",
  "open-meteo",
]);
export const sourcePolicy = z
  .object({
    analysis: z.boolean(),
    persistence: z.boolean(),
    derivedOutputs: z.boolean(),
    aiDisclosure: z.boolean(),
    decisionId: z.string().min(1),
  })
  .strict();
export const attribution = z
  .object({
    label: z.string().max(200),
    url: z.url(),
    licenceUrl: z.url(),
    changes: z.string().max(300),
  })
  .strict();
export const provenance = z
  .object({
    sourceKind,
    sourceId: z.string().min(1),
    retrievedAt: utcInstant,
    expiresAt: utcInstant.nullable(),
    policy: sourcePolicy,
    attribution: attribution.optional(),
  })
  .strict();
export const coordinate = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
export const segment = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    geometry: z
      .object({
        type: z.literal("LineString"),
        coordinates: z.array(coordinate).min(2).max(10000),
      })
      .strict(),
    provenance,
  })
  .strict();
export const effort = z
  .object({
    id: z.string(),
    segmentId: z.string(),
    startedAt: utcInstant,
    elapsedSeconds: z.number().positive(),
    provenance,
  })
  .strict();
export const weatherHour = z
  .object({
    validAt: utcInstant,
    windSpeedMps: z.number().nonnegative().nullable(),
    windFromDegrees: z.number().min(0).lt(360).nullable(),
    gustMps: z.number().nonnegative().nullable(),
    precipitationMm: z.number().nonnegative().nullable(),
    precipitationProbabilityPct: z.number().min(0).max(100).nullable(),
    temperatureC: z.number().nullable(),
    provenance,
  })
  .strict();
export const errorCode = z.enum([
  "AUTH_REQUIRED",
  "SOURCE_NOT_PERMITTED",
  "CAPABILITY_UNAVAILABLE",
  "GEOMETRY_INVALID",
  "FORECAST_UNAVAILABLE",
  "OUTSIDE_FORECAST_RANGE",
  "RATE_LIMITED",
  "INSUFFICIENT_HISTORY",
]);
export const units = {
  distance: "m",
  duration: "s",
  wind: "m/s",
  direction: "degrees",
  precipitation: "mm",
  temperature: "C",
} as const;
export type Provenance = z.infer<typeof provenance>;
export type SourcePolicy = z.infer<typeof sourcePolicy>;
export type Segment = z.infer<typeof segment>;

export const forecastWindow = z
  .object({ startAt: utcInstant, endAt: utcInstant })
  .strict()
  .refine(
    (w) =>
      Date.parse(w.endAt) > Date.parse(w.startAt) &&
      Date.parse(w.endAt) - Date.parse(w.startAt) <= 48 * 3600000,
    "Window must be positive and at most 48 hours",
  );
export const forecastRequest = z
  .object({
    points: z.array(coordinate).min(1).max(50),
    window: forecastWindow,
  })
  .strict();
export const forecastSnapshot = z
  .object({
    provenance,
    requestedCoordinate: coordinate,
    gridCoordinate: coordinate,
    retrievedAt: utcInstant,
    freshUntil: utcInstant,
    expiresAt: utcInstant,
    metadata: z
      .object({
        requestedModel: z.literal("best_match"),
        model: z.string().nullable(),
        modelIssuedAt: utcInstant.nullable(),
        elevationM: z.number().nullable(),
        timezone: z.string(),
        utcOffsetSeconds: z.literal(0),
      })
      .strict(),
    hours: z.array(weatherHour).max(48),
    attribution,
    warnings: z.array(z.string()),
  })
  .strict();
export type ForecastRequest = z.infer<typeof forecastRequest>;
export type ForecastSnapshot = z.infer<typeof forecastSnapshot>;
export type ForecastWindow = z.infer<typeof forecastWindow>;
export type WeatherFailure = {
  code:
    | "FORECAST_UNAVAILABLE"
    | "RATE_LIMITED"
    | "OUTSIDE_FORECAST_RANGE"
    | "SOURCE_NOT_PERMITTED";
  retryAt: string | null;
};
export type ForecastResult = {
  status: "fresh" | "stale" | "unavailable";
  snapshots: ForecastSnapshot[];
  error: WeatherFailure | null;
};

export const plannerRequest = z
  .object({
    date: z.iso.date(),
    startTime: z.string().regex(/^\d\d:\d\d$/),
    endTime: z.string().regex(/^\d\d:\d\d$/),
    timeZone: z.string().min(1).max(80),
    segmentIds: z.array(z.enum(["demo-north", "demo-bend"])).max(2),
    scenario: z
      .enum(["normal", "incomplete", "outage", "partial", "stale"])
      .default("normal"),
    startChoice: z.enum(["earlier", "later"]).optional(),
    endChoice: z.enum(["earlier", "later"]).optional(),
  })
  .strict();
export const defaultPlannerRequest = {
  date: "2026-09-08",
  startTime: "16:00",
  endTime: "20:00",
  timeZone: "Europe/London",
  segmentIds: ["demo-north", "demo-bend"],
  scenario: "normal",
} satisfies z.infer<typeof plannerRequest>;
export const plannerLeg = z.object({
  start: coordinate,
  end: coordinate,
  distanceM: z.number().positive(),
  bearingDegrees: z.number(),
  tailwindMps: z.number(),
  crosswindMps: z.number(),
  windBearingDegrees: z.number().nullable(),
});
export const rideEffect = z.object({
  version: z.literal("ride-effect-v1"),
  riderHeightFactor: z.number().positive().max(1),
  calmSpeedMps: z.number().positive(),
  windSpeedMps: z.number().positive(),
  speedDeltaMps: z.number(),
  timeDeltaS: z.number(),
  band: z
    .object({
      leadHours: z.number().min(0),
      windSigmaMps: z.number().positive(),
      directionSigmaDegrees: z.number().positive(),
      speedDeltaLowMps: z.number(),
      speedDeltaHighMps: z.number(),
    })
    .nullable(),
  rider: z.object({
    calmSpeedKmh: z.number().positive(),
    cdaM2: z.number().positive(),
    crr: z.number().positive(),
    massKg: z.number().positive(),
    airDensity: z.number().positive(),
  }),
});
export const plannerHour = z.object({
  segmentId: z.string().min(1).max(80),
  attemptAt: utcInstant,
  timeZone: z.string().min(1).max(80),
  tailwindMps: z.number(),
  meanAbsCrosswindMps: z.number(),
  maxAbsCrosswindMps: z.number(),
  worstHeadwindMps: z.number(),
  tailwindFraction: z.number(),
  gustMps: z.number().nullable(),
  precipitationMm: z.number().nullable(),
  precipitationProbabilityPct: z.number().nullable(),
  weatherIndex: z.number(),
  warnings: z.array(z.string().max(300)).max(20),
  caution: z.boolean(),
  dataQuality: z.enum(["complete", "incomplete"]),
  retrievedAt: utcInstant,
  algorithmVersion: z.literal("wind-v1"),
  prediction: z.null(),
  predictionReason: z.string().max(1000),
  limitations: z.string().max(1000),
  rideEffect: rideEffect,
  legs: z.array(plannerLeg).max(2000),
});
export const plannerResponse = z.object({
  mode: z.literal("demo"),
  referenceAt: utcInstant,
  request: plannerRequest,
  window: forecastWindow,
  coverage: forecastWindow,
  segments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        lengthM: z.number(),
        direction: z.string(),
        gradePct: z.number().nullable(),
      }),
    )
    .max(2),
  hourly: z.array(plannerHour).max(96),
  best: z
    .array(z.object({ segmentId: z.string(), attemptAt: utcInstant }))
    .max(2),
  errors: z
    .array(
      z.object({
        segmentId: z.string(),
        attemptAt: utcInstant.nullable(),
        code: z.string(),
      }),
    )
    .max(100),
  status: z.enum(["fresh", "stale", "unavailable"]),
  retrievedAt: utcInstant.nullable(),
  attribution: z.array(attribution).max(50),
});
export type PlannerRequest = z.infer<typeof plannerRequest>;
export type PlannerResponse = z.infer<typeof plannerResponse>;
export type PlannerHour = z.infer<typeof plannerHour>;

// Planner display contracts. Transport metadata cannot grant ownership or source rights.
export const displayZone = z
  .string()
  .min(1)
  .max(80)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return !/^[+-]/.test(value);
    } catch {
      return false;
    }
  }, "Expected an IANA time zone");
const demoSegmentId = z.string().min(1).max(80);
export const segmentSummary = z
  .object({
    id: demoSegmentId,
    name: z.string().min(1).max(200),
    lengthM: z.number().positive(),
    direction: z.string().max(100),
    gradePct: z.number().nullable(),
  })
  .strict();
export const demoConditions = plannerResponse
  .omit({ request: true, segments: true })
  .extend({
    timeZone: displayZone,
    segments: z.array(segmentSummary).max(2),
    sources: z.array(provenance).max(52),
  });
export type DemoConditions = z.infer<typeof demoConditions>;

// Raw Open-Meteo response shapes as the planner and providers request them.
// Recorded fixtures in packages/testing are validated against these, and the
// advisory CI drift job validates live responses so an upstream change fails
// loudly instead of surfacing as a parsing quirk.
const openMeteoColumn = z.array(z.number().nullable());
const openMeteoBase = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  generationtime_ms: z.number().nonnegative(),
  utc_offset_seconds: z.literal(0),
  timezone: z.enum(["GMT", "UTC"]),
  timezone_abbreviation: z.string(),
  elevation: z.number().nullable().optional(),
  location_id: z.number().int().optional(),
  hourly_units: z.record(z.string(), z.string()),
};
export const openMeteoForecastResponse = z
  .object({
    ...openMeteoBase,
    hourly: z
      .object({
        time: z
          .union([z.array(z.number().int()), z.array(z.string())])
          .refine(
            (times) => times.length >= 1 && times.length <= 48,
            "Expected 1 to 48 hourly rows",
          ),
        wind_speed_10m: openMeteoColumn.optional(),
        wind_direction_10m: openMeteoColumn.optional(),
        wind_gusts_10m: openMeteoColumn.optional(),
        precipitation: openMeteoColumn.optional(),
        precipitation_probability: openMeteoColumn.optional(),
        temperature_2m: openMeteoColumn.optional(),
        weather_code: openMeteoColumn.optional(),
        is_day: openMeteoColumn.optional(),
      })
      .strict()
      .refine(
        (hourly) =>
          Object.values(hourly).every(
            (column) =>
              column === undefined || column.length === hourly.time.length,
          ),
        "Every hourly column must have one value per time",
      ),
  })
  .strict();
export const openMeteoForecastResponses = z.union([
  openMeteoForecastResponse,
  z.array(openMeteoForecastResponse).min(1).max(50),
]);
export const openMeteoArchiveResponse = z
  .object({
    ...openMeteoBase,
    hourly: z
      .object({
        time: z
          .union([z.array(z.number().int()), z.array(z.string())])
          .refine(
            (times) => times.length >= 24 && times.length % 24 === 0,
            "Archive rows come in whole days",
          ),
        wind_speed_10m: openMeteoColumn.optional(),
        wind_direction_10m: openMeteoColumn.optional(),
        wind_gusts_10m: openMeteoColumn.optional(),
        precipitation: openMeteoColumn.optional(),
      })
      .strict()
      .refine(
        (hourly) =>
          Object.values(hourly).every(
            (column) =>
              column === undefined || column.length === hourly.time.length,
          ),
        "Every hourly column must have one value per time",
      ),
  })
  .strict();
export const openMeteoElevationResponse = z
  .object({
    elevation: z.array(z.number().min(-500).max(9000)).min(1).max(100),
  })
  .strict();
export type OpenMeteoForecastResponse = z.infer<
  typeof openMeteoForecastResponse
>;
export type OpenMeteoArchiveResponse = z.infer<typeof openMeteoArchiveResponse>;
export type OpenMeteoElevationResponse = z.infer<
  typeof openMeteoElevationResponse
>;
