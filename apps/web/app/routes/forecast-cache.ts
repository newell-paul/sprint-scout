import {
  loadRouteWind,
  type RouteWindForecast,
} from "@scout/application/route-wind";
import type { Point } from "./library";
// In-memory, per-tab cache of start-point forecasts so switching between the
// board and a segment does not repeat a request. Entries expire with the
// forecast's own freshness window; failures are not cached. Requests are
// shared, so a consumer that goes away simply ignores the result; it cannot
// abort a request another consumer is waiting on.
const cache = new Map<string, Promise<RouteWindForecast>>();
const settled = new Map<string, RouteWindForecast>();
const key = (point: Point) => `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
// Synchronous read of a fresh cached forecast, so a segment opened from the
// board renders its cockpit on the first paint instead of after a round trip.
export function peekRouteForecast(point: Point): RouteWindForecast | null {
  const forecast = settled.get(key(point));
  return forecast && forecast.expiresAt > Date.now() ? forecast : null;
}
export function getRouteForecast(
  point: Point,
  confirmed: boolean,
  options: { force?: boolean; timeoutMs?: number } = {},
): Promise<RouteWindForecast> {
  const id = key(point);
  const existing = options.force ? undefined : cache.get(id);
  if (existing)
    return existing.then((forecast) => {
      if (forecast.expiresAt > Date.now()) return forecast;
      if (cache.get(id) === existing) cache.delete(id);
      return getRouteForecast(point, confirmed, options);
    });
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 12_000,
  );
  const promise = loadRouteWind(
    // The save-time confirmation covers both the source and sharing the
    // start coordinate with Open-Meteo; there is no separate weather switch.
    { point, independentConfirmed: confirmed, weatherConsent: confirmed },
    controller.signal,
  ).finally(() => window.clearTimeout(timer));
  cache.set(id, promise);
  promise.then(
    (forecast) => settled.set(id, forecast),
    () => {
      if (cache.get(id) === promise) cache.delete(id);
    },
  );
  return promise;
}
