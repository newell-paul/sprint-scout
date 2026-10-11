import type { Page } from "@playwright/test";
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

export type OpenMeteo = OpenMeteoConfig & {
  /** Requests seen so far, by endpoint. */
  calls: { weather: number; elevation: number; archive: number };
  /** Longitude of every forecast request, in order, to assert one fetch per point. */
  weatherLongitudes: string[];
  /** Hold the next elevation response until `release` is called. */
  holdElevation(): { started: Promise<void>; release: () => void };
};

/** Route Open-Meteo and tile requests on a page, sharing the msw response builders. */
export async function installOpenMeteo(page: Page): Promise<OpenMeteo> {
  let hold: { started: () => void; released: Promise<void> } | null = null;
  const meteo: OpenMeteo = {
    ...defaultOpenMeteoConfig(),
    calls: { weather: 0, elevation: 0, archive: 0 },
    weatherLongitudes: [],
    holdElevation() {
      let started = () => {};
      let release = () => {};
      const startedPromise = new Promise<void>((resolve) => {
        started = resolve;
      });
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      hold = { started, released };
      return { started: startedPromise, release };
    },
  };
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
  await page.route(`${openMeteoHosts.elevation}?**`, async (route) => {
    meteo.calls.elevation++;
    if (hold) {
      const pending = hold;
      hold = null;
      pending.started();
      await pending.released;
    }
    if (meteo.faults.elevation === "outage")
      return route
        .fulfill({ status: 503, body: "unavailable" })
        .catch(() => {});
    return route
      .fulfill({
        json: elevationBody(meteo, latitudesFrom(route.request().url())),
      })
      .catch(() => {});
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
