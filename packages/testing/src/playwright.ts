import type { Page } from "@playwright/test";
import {
  archiveBody,
  archiveDatesFrom,
  defaultOpenMeteoConfig,
  forecastBody,
  openMeteoHosts,
  startHourFrom,
  type OpenMeteoConfig,
} from "./open-meteo";

export type OpenMeteo = OpenMeteoConfig & {
  /** Requests seen so far, by endpoint. */
  calls: { weather: number; archive: number };
  /** Longitude of every forecast request, in order, to assert one fetch per point. */
  weatherLongitudes: string[];
  /** External requests no stub answered; the e2e fixture fails the test on any. */
  unhandled: string[];
};

const local = new Set(["127.0.0.1", "localhost"]);

export async function installOpenMeteo(page: Page): Promise<OpenMeteo> {
  const meteo: OpenMeteo = {
    ...defaultOpenMeteoConfig(),
    calls: { weather: 0, archive: 0 },
    weatherLongitudes: [],
    unhandled: [],
  };
  // Registered first so it runs last: only requests no stub below matches.
  await page.route(
    (url) => url.protocol.startsWith("http") && !local.has(url.hostname),
    (route) => {
      meteo.unhandled.push(route.request().url());
      return route.abort();
    },
  );
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.route(`${openMeteoHosts.forecast}?**`, async (route) => {
    meteo.calls.weather++;
    meteo.weatherLongitudes.push(
      new URL(route.request().url()).searchParams.get("longitude") ?? "",
    );
    switch (meteo.faults.weather) {
      case "outage":
        return route.fulfill({ status: 503, body: "unavailable" });
      case "rateLimit":
        return route.fulfill({ status: 429, body: "slow down" });
      case "empty":
        return route.fulfill({ json: { utc_offset_seconds: 0 } });
      case "timeout":
        // Never answered: the app's own deadline decides the outcome.
        return new Promise<void>(() => {});
      default:
        return route.fulfill({
          json: forecastBody(meteo, startHourFrom(route.request().url())),
        });
    }
  });
  await page.route(`${openMeteoHosts.archive}?**`, async (route) => {
    meteo.calls.archive++;
    switch (meteo.faults.archive) {
      case "outage":
        return route.fulfill({ status: 503, body: "unavailable" });
      case "rateLimit":
        return route.fulfill({ status: 429, body: "slow down" });
      default: {
        const { start, end } = archiveDatesFrom(route.request().url());
        return route.fulfill({ json: archiveBody(meteo, start, end) });
      }
    }
  });
  return meteo;
}
