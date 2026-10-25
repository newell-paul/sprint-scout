import { delay, http, HttpResponse } from "msw";
import {
  archiveBody,
  archiveDatesFrom,
  defaultOpenMeteoConfig,
  elevationBody,
  forecastBody,
  latitudesFrom,
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
    http.get(openMeteoHosts.elevation, async ({ request }) => {
      if (config.faults.elevation === "timeout") await delay("infinite");
      return config.faults.elevation === "outage"
        ? new HttpResponse("unavailable", { status: 503 })
        : HttpResponse.json(elevationBody(config, latitudesFrom(request.url)));
    }),
    http.get(openMeteoHosts.archive, async ({ request }) => {
      switch (config.faults.archive) {
        case "timeout":
          await delay("infinite");
          return HttpResponse.error();
        case "outage":
          return new HttpResponse("unavailable", { status: 503 });
        case "rateLimit":
          return new HttpResponse("slow down", { status: 429 });
        default: {
          // Long enough for a test to act while the request is in flight.
          if (config.faults.archive === "slow") await delay(300);
          const { start, end } = archiveDatesFrom(request.url);
          return HttpResponse.json(archiveBody(config, start, end));
        }
      }
    }),
  ];
}
