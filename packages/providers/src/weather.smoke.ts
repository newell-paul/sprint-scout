import { OpenMeteoProvider, defaultForecastWindow } from "./weather";
if (process.env.LIVE_WEATHER_SMOKE !== "1") {
  console.log(
    "Skipped: set LIVE_WEATHER_SMOKE=1 to request live weather for the fixed synthetic demo coordinate.",
  );
} else {
  const provider = new OpenMeteoProvider("live-demo");
  const result = await provider.getForecast({
    points: [[0, 51]],
    window: defaultForecastWindow(new Date()),
  });
  if (result.status !== "fresh" || !result.snapshots[0]?.hours.length) {
    console.error(
      "Live weather smoke failed:",
      result.error?.code ?? "FORECAST_UNAVAILABLE",
    );
    process.exitCode = 1;
  } else
    console.log(
      JSON.stringify({
        status: result.status,
        hours: result.snapshots[0].hours.length,
        retrievedAt: result.snapshots[0].retrievedAt,
        attribution: result.snapshots[0].attribution,
      }),
    );
}
