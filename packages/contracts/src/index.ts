import { z } from "zod";
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
export type Provenance = z.infer<typeof provenance>;

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
