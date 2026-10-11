import {
  estimateRouteRideEffect,
  type RouteWindForecast,
} from "@scout/application/route-wind";
import type { Rider } from "@scout/analysis";
import { bestHourIndex } from "../components/conditions";
import type { DrawnRoute } from "./library";
import type { Availability } from "./attempt";
export type Opportunity = {
  route: DrawnRoute;
  status: "ranked" | "loading" | "unavailable";
  reason: string;
  bestIndex: number;
  bestAt: string | null;
  bestTimeS: number | null;
  calmTimeS: number | null;
  gainS: number | null;
  timesS: (number | null)[];
  hours: RouteWindForecast["hours"];
};
export type ForecastState =
  | { status: "loading" }
  | { status: "ready"; forecast: RouteWindForecast }
  | { status: "error"; message: string };
/** Earliest freshness expiry among loaded forecasts, or null when none. */
export function nextExpiry(
  forecasts: ReadonlyMap<string, ForecastState>,
): number | null {
  let next: number | null = null;
  for (const state of forecasts.values())
    if (
      state.status === "ready" &&
      (next === null || state.forecast.expiresAt < next)
    )
      next = state.forecast.expiresAt;
  return next;
}
// Code-unit order with the id as the final tie-breaker, so the ranking is the
// same in every locale and for identically named segments.
const byName = (a: DrawnRoute, b: DrawnRoute) =>
  a.name < b.name
    ? -1
    : a.name > b.name
      ? 1
      : a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0;
// Ranks every saved segment by time gained at its own best hour. Positive
// gain means quicker than still air. Unranked segments sort last, by name.
export function rankOpportunities(
  routes: readonly DrawnRoute[],
  forecasts: ReadonlyMap<string, ForecastState>,
  rider: Rider,
  daylightDryOnly: boolean,
  availability: Availability | null = null,
): Opportunity[] {
  const rows = routes.map((route): Opportunity => {
    const state = forecasts.get(route.id);
    const empty = {
      route,
      bestIndex: -1,
      bestAt: null,
      bestTimeS: null,
      calmTimeS: null,
      gainS: null,
      timesS: [],
      hours: [],
    };
    if (!state || state.status === "loading")
      return { ...empty, status: "loading", reason: "Loading forecast…" };
    if (state.status === "error")
      return { ...empty, status: "unavailable", reason: state.message };
    const { forecast } = state;
    const effects = forecast.hours.map((hour) =>
      estimateRouteRideEffect(
        route.points,
        hour,
        forecast.retrievedAt,
        rider,
        route.terrainMode === "terrain" ? (route.terrain ?? null) : undefined,
        route.shelter ?? "exposed",
      ),
    );
    const bestIndex = bestHourIndex(
      effects,
      forecast.hours,
      daylightDryOnly,
      availability,
      forecast.hours.map((hour) => hour.at),
    );
    const best = effects[bestIndex];
    if (bestIndex === -1 || !best)
      return {
        ...empty,
        status: "unavailable",
        hours: forecast.hours,
        timesS: effects.map((effect) => effect?.windTimeS ?? null),
        reason: availability
          ? "No eligible forecast hour in your availability."
          : daylightDryOnly
            ? "No dry daylight hour with wind data."
            : route.terrainMode === "terrain" && !route.terrain
              ? "Terrain not loaded. Load terrain or choose the flat-road estimate."
              : "Wind data missing or segment cannot be modelled.",
      };
    return {
      route,
      status: "ranked",
      reason: "",
      bestIndex,
      bestAt: forecast.hours[bestIndex]!.at,
      bestTimeS: best.windTimeS,
      calmTimeS: best.calmTimeS,
      gainS: best.calmTimeS - best.windTimeS,
      timesS: effects.map((effect) => effect?.windTimeS ?? null),
      hours: forecast.hours,
    };
  });
  return rows.sort((a, b) => {
    if (a.gainS !== null && b.gainS !== null) {
      if (b.gainS !== a.gainS) return b.gainS - a.gainS;
      return byName(a.route, b.route);
    }
    if (a.gainS !== null) return -1;
    if (b.gainS !== null) return 1;
    if (a.status !== b.status) return a.status === "loading" ? -1 : 1;
    return byName(a.route, b.route);
  });
}
