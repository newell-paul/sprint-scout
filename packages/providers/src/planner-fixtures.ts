import {
  OpenMeteoProvider,
  hourlyInstants,
  type WeatherProvider,
} from "./weather";
import { syntheticOpenMeteoResponse } from "./weather-fixtures";
export const plannerReferenceAt = "2026-09-08T12:00:00Z";
export const plannerCoverage = {
  startAt: "2026-09-08T00:00:00Z",
  endAt: "2026-09-10T00:00:00Z",
};
export function createPlannerProvider(
  scenario: "normal" | "incomplete" | "outage" | "partial" | "stale",
): WeatherProvider {
  const provider = new OpenMeteoProvider("synthetic", {
    now: () => Date.parse(plannerReferenceAt),
    fetch: async (input) => {
      const url = new URL(String(input));
      const lat = url.searchParams.get("latitude")!.split(",").map(Number);
      const lon = url.searchParams.get("longitude")!.split(",").map(Number);
      const start = url.searchParams.get("start_hour")! + ":00Z",
        end = url.searchParams.get("end_hour")! + ":00Z";
      const times = hourlyInstants(plannerCoverage).filter(
        (t) => t >= start && t <= end,
      );
      const raw = syntheticOpenMeteoResponse(
        lat.map((y, i) => [lon[i]!, y]),
        times,
      ).map((snapshot) => ({
        ...snapshot,
        hourly: {
          ...snapshot.hourly,
          wind_speed_10m: times.map(
            (t) => [3, 4, 5, 4, 2, 3][new Date(t).getUTCHours() % 6]!,
          ),
          wind_direction_10m: times.map(
            (t) =>
              [180, 210, 240, 270, 315, 180][new Date(t).getUTCHours() % 6]!,
          ),
          wind_gusts_10m: times.map((t) =>
            scenario === "incomplete"
              ? null
              : new Date(t).getUTCHours() % 6 === 0
                ? 12
                : 7,
          ),
          precipitation: times.map((t) =>
            scenario === "incomplete"
              ? null
              : new Date(t).getUTCHours() % 6 === 0
                ? 0.8
                : 0,
          ),
        },
      }));
      return Response.json(raw);
    },
  });
  return {
    getForecast: async (request) => {
      if (scenario === "outage")
        return {
          status: "unavailable",
          snapshots: [],
          error: { code: "FORECAST_UNAVAILABLE", retryAt: null },
        };
      const result = await provider.getForecast(request);
      if (scenario === "stale" && result.status === "fresh")
        return {
          ...result,
          status: "stale",
          error: { code: "FORECAST_UNAVAILABLE", retryAt: null },
        };
      return result;
    },
  };
}
