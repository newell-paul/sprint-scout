import { demoSegments, createSyntheticWeatherProvider } from "@scout/providers";
import { getForecastConditions } from "./forecast";
const provider = createSyntheticWeatherProvider();
export async function getDemoForecast() {
  const result = await getForecastConditions(
    demoSegments,
    {
      startAt: "2026-09-08T16:00:00Z",
      endAt: "2026-09-08T18:00:00Z",
      timeZone: "Europe/London",
    },
    provider,
    new Date("2026-09-07T12:00:00Z"),
  );
  return {
    mode: "demo" as const,
    fixtureClock: "2026-09-07T12:00:00Z",
    ...result,
  };
}
