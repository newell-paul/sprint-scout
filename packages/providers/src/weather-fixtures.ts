import { OpenMeteoProvider } from "./weather";
// Manually authored response shape; every number and timestamp is synthetic.
export function syntheticOpenMeteoResponse(
  points: readonly [number, number][],
  times: readonly string[],
) {
  return points.map(([longitude, latitude]) => ({
    latitude,
    longitude,
    elevation: 20,
    timezone: "GMT",
    utc_offset_seconds: 0,
    hourly_units: {
      time: "iso8601",
      wind_speed_10m: "m/s",
      wind_direction_10m: "°",
      wind_gusts_10m: "m/s",
      precipitation: "mm",
      precipitation_probability: "%",
      temperature_2m: "°C",
    },
    hourly: {
      time: times.map((t) => t.slice(0, 16)),
      wind_speed_10m: times.map((_, i) => 3 + (i % 4)),
      wind_direction_10m: times.map((_, i): number => (i % 2 === 0 ? 359 : 1)),
      wind_gusts_10m: times.map(() => 7),
      precipitation: times.map(() => 0),
      precipitation_probability: times.map(() => 10),
      temperature_2m: times.map(() => 18),
    },
  }));
}
export function createSyntheticWeatherProvider() {
  const fixedNow = Date.parse("2026-09-07T12:00:00Z");
  return new OpenMeteoProvider("synthetic", {
    now: () => fixedNow,
    fetch: async (input) => {
      const url = new URL(String(input));
      const lat = url.searchParams.get("latitude")!.split(",").map(Number),
        lon = url.searchParams.get("longitude")!.split(",").map(Number);
      const times = ["2026-09-08T16:00:00Z", "2026-09-08T17:00:00Z"];
      return Response.json(
        syntheticOpenMeteoResponse(
          lat.map((y, i) => [lon[i]!, y]),
          times,
        ),
      );
    },
  });
}
