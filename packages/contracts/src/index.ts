import { z } from "zod";
// Zod probes for eval with Function(""), which the published page's content
// security policy reports as a violation; the interpreted parser is enough.
z.config({ jitless: true });
export const coordinate = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
export const lineString = z
  .object({
    type: z.literal("LineString"),
    coordinates: z.array(coordinate).min(2).max(10000),
  })
  .strict();

// Raw Open-Meteo response shapes as the planner requests them.
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
