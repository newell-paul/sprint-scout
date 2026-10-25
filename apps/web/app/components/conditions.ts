import type { RouteWindHour } from "@scout/application/route-wind";
import { weatherKind } from "./weather-icon";
import { withinAvailability, type Availability } from "../routes/attempt";
// Precipitation or storm per the provider's WMO code. Fog and cloud are dry.
export function isWet(code: number | null) {
  const kind = weatherKind(code, true)?.kind;
  return (
    kind === "drizzle" ||
    kind === "rain" ||
    kind === "showers" ||
    kind === "snow" ||
    kind === "thunder"
  );
}
export type ConditionBand = {
  kind: "night" | "wet";
  from: number;
  to: number;
};
// Runs of consecutive hours, as inclusive index ranges, for chart shading.
export function conditionBands(
  hours: readonly Pick<RouteWindHour, "isDay" | "weatherCode">[],
): ConditionBand[] {
  const bands: ConditionBand[] = [];
  const collect = (
    kind: ConditionBand["kind"],
    test: (hour: Pick<RouteWindHour, "isDay" | "weatherCode">) => boolean,
  ) => {
    let open: ConditionBand | null = null;
    hours.forEach((hour, index) => {
      if (test(hour)) {
        if (open && open.to === index - 1) open.to = index;
        else {
          open = { kind, from: index, to: index };
          bands.push(open);
        }
      } else open = null;
    });
  };
  collect("night", (hour) => hour.isDay === false);
  collect("wet", (hour) => isWet(hour.weatherCode));
  return bands;
}
export function describeConditions(
  hour: Pick<RouteWindHour, "isDay" | "weatherCode">,
) {
  const kind = weatherKind(hour.weatherCode, hour.isDay);
  const parts = [kind?.label ?? "Conditions unknown"];
  if (hour.isDay === false && kind?.kind !== "moon") parts.push("night");
  return parts.join(" · ");
}
// Best hour: largest speed benefit, or the smallest loss. Optionally only
// daylight and dry hours; unknown daylight or weather counts as unsuitable.
export function bestHourIndex(
  effects: readonly ({ speedDeltaMps: number } | null)[],
  hours: readonly (Pick<RouteWindHour, "isDay" | "weatherCode"> &
    Partial<Pick<RouteWindHour, "at">>)[],
  daylightDryOnly: boolean,
  availability: Availability | null = null,
) {
  return effects.reduce((best, effect, position) => {
    if (!effect) return best;
    if (
      availability &&
      !withinAvailability(hours[position]?.at ?? "", availability)
    )
      return best;
    const hour = hours[position];
    if (
      daylightDryOnly &&
      (!hour ||
        hour.isDay !== true ||
        hour.weatherCode === null ||
        isWet(hour.weatherCode))
    )
      return best;
    return best === -1 || effect.speedDeltaMps > effects[best]!.speedDeltaMps
      ? position
      : best;
  }, -1);
}
