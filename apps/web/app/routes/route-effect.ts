import type { Rider } from "@scout/analysis";
import {
  estimateRouteRideEffect,
  type RouteWindHour,
} from "@scout/application/route-wind";
import type { DrawnRoute } from "./library";

/** The ride effect for a saved segment with its own shelter. */
export const routeEffect = (
  route: Pick<DrawnRoute, "points" | "shelter">,
  hour: Pick<RouteWindHour, "speedMps" | "fromDegrees" | "at">,
  rider: Rider,
  retrievedAt?: string,
) =>
  estimateRouteRideEffect(
    route.points,
    hour,
    retrievedAt,
    rider,
    route.shelter ?? "exposed",
  );
