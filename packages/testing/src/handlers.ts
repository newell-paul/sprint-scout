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
    http.get(openMeteoHosts.elevation, ({ request }) =>
      config.faults.elevation === "outage"
        ? new HttpResponse("unavailable", { status: 503 })
        : HttpResponse.json(elevationBody(config, latitudesFrom(request.url))),
    ),
    http.get(openMeteoHosts.archive, ({ request }) => {
      switch (config.faults.archive) {
        case "outage":
          return new HttpResponse("unavailable", { status: 503 });
        case "rateLimit":
          return new HttpResponse("slow down", { status: 429 });
        default: {
          const { start, end } = archiveDatesFrom(request.url);
          return HttpResponse.json(archiveBody(config, start, end));
        }
      }
    }),
  ];
}
