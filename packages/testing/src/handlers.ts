import { delay, http, HttpResponse } from "msw";
import {
  defaultOpenMeteoConfig,
  forecastBody,
  openMeteoHosts,
  startHourFrom,
  type OpenMeteoConfig,
} from "./open-meteo";

// Same builders as the e2e routes, so unit, component and e2e tests cannot disagree.
export function openMeteoHandlers(
  config: OpenMeteoConfig = defaultOpenMeteoConfig(),
) {
  return [
    http.get(openMeteoHosts.forecast, async ({ request }) => {
      switch (config.faults.weather) {
        case "outage":
          return new HttpResponse("unavailable", { status: 503 });
        case "rateLimit":
          return new HttpResponse("slow down", { status: 429 });
        case "empty":
          return HttpResponse.json({ utc_offset_seconds: 0 });
        case "timeout":
          await delay("infinite");
          return HttpResponse.error();
        default:
          return HttpResponse.json(
            forecastBody(config, startHourFrom(request.url)),
          );
      }
    }),
  ];
}
