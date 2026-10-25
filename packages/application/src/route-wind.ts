// Browser-local independent-route preview.
import { coordinate } from "@scout/contracts";
import {
  estimateRideEffect,
  estimateTerrainEffect,
  prepareGeometry,
  projectWind,
  referenceRider,
  type RideEffect,
  type Rider,
  type TerrainEffect,
} from "@scout/analysis";
import { prepareTerrain, type TerrainProfile } from "./terrain";
import { isShelter, shelterPresets, type Shelter } from "./shelter";
import { fetchOpenMeteo } from "./open-meteo-fetch";
export type RouteWindHour = {
  at: string;
  speedMps: number | null;
  fromDegrees: number | null;
  flowDegrees: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
  gustMps?: number | null;
  precipitationMm?: number | null;
  precipitationProbabilityPct?: number | null;
};
export type RouteWindForecast = {
  hours: RouteWindHour[];
  retrievedAt: string;
  expiresAt: number;
  point: [number, number];
};
const hourMs = 3_600_000;
export function routeCrosswind(
  points: unknown,
  hour: Pick<RouteWindHour, "speedMps" | "fromDegrees">,
): number | null {
  if (hour.speedMps === null) return null;
  try {
    const geometry = prepareGeometry({
      type: "LineString",
      coordinates: points,
    });
    return geometry.legs.reduce(
      (total, leg) =>
        total +
        (Math.abs(
          projectWind(hour.speedMps!, hour.fromDegrees, leg.bearingDegrees)
            .crosswindMps,
        ) *
          leg.distanceM) /
          geometry.lengthM,
      0,
    );
  } catch {
    return null;
  }
}
export function describeRouteWind(
  points: unknown,
  hour: Pick<RouteWindHour, "speedMps" | "fromDegrees">,
): string {
  if (hour.speedMps === null) return "Wind unavailable";
  if (hour.speedMps === 0) return "Calm";
  try {
    const geometry = prepareGeometry({
      type: "LineString",
      coordinates: points,
    });
    let tailwind = 0;
    let crosswind = 0;
    let assisted = 0;
    let opposed = 0;
    for (const leg of geometry.legs) {
      const wind = projectWind(
        hour.speedMps,
        hour.fromDegrees,
        leg.bearingDegrees,
      );
      const weight = leg.distanceM / geometry.lengthM;
      tailwind += wind.tailwindMps * weight;
      crosswind += Math.abs(wind.crosswindMps) * weight;
      if (wind.tailwindMps > 0.5) assisted += weight;
      if (wind.tailwindMps < -0.5) opposed += weight;
    }
    if (assisted >= 0.2 && opposed >= 0.2) return "Mixed headwind and tailwind";
    if (crosswind > 0.5 && crosswind > Math.abs(tailwind))
      return "Mostly crosswind";
    if (tailwind > 0.5) return "Tailwind";
    if (tailwind < -0.5) return "Headwind";
    return "Light wind effect";
  } catch {
    return "Route wind unavailable";
  }
}
export function parseRouteWind(input: unknown, start: number): RouteWindHour[] {
  if (!input || typeof input !== "object")
    throw new Error("Invalid weather response.");
  const v = input as Record<string, unknown>;
  const units = v.hourly_units as Record<string, unknown> | undefined;
  const h = v.hourly as Record<string, unknown> | undefined;
  if (
    v.utc_offset_seconds !== 0 ||
    units?.time !== "unixtime" ||
    units.wind_speed_10m !== "m/s" ||
    units.wind_direction_10m !== "°"
  )
    throw new Error("Unexpected forecast units.");
  const times = h?.time,
    speeds = h?.wind_speed_10m,
    directions = h?.wind_direction_10m,
    codes = Array.isArray(h?.weather_code) ? h.weather_code : null,
    days = Array.isArray(h?.is_day) ? h.is_day : null;
  if (
    !Array.isArray(times) ||
    !Array.isArray(speeds) ||
    !Array.isArray(directions) ||
    times.length > 48 ||
    speeds.length !== times.length ||
    directions.length !== times.length ||
    (codes && codes.length !== times.length) ||
    (days && days.length !== times.length)
  )
    throw new Error("Invalid forecast columns.");
  const supplied = new Map<number, RouteWindHour>();
  const optionalNumber = (
    key: string,
    unit: string,
    position: number,
    maximum: number,
  ) => {
    const column = h?.[key];
    if (column === undefined) return null;
    if (
      units?.[key] !== unit ||
      !Array.isArray(column) ||
      column.length !== times.length
    )
      throw new Error("Invalid optional forecast column or units.");
    const value: unknown = column[position];
    if (value === null) return null;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > maximum
    )
      throw new Error("Invalid optional forecast value.");
    return value;
  };
  times.forEach((time: unknown, i) => {
    const speed: unknown = speeds[i],
      from: unknown = directions[i];
    if (
      typeof time !== "number" ||
      !Number.isFinite(time) ||
      time * 1000 < start ||
      time * 1000 >= start + 48 * hourMs ||
      (time * 1000) % hourMs !== 0 ||
      (i > 0 && time <= Number(times[i - 1])) ||
      (speed !== null &&
        (typeof speed !== "number" ||
          !Number.isFinite(speed) ||
          speed < 0 ||
          speed > 150)) ||
      (from !== null &&
        (typeof from !== "number" ||
          !Number.isFinite(from) ||
          from < 0 ||
          from > 360))
    )
      throw new Error("Invalid forecast values.");
    const direction = from === null ? null : from % 360;
    const usable = speed !== null && (speed === 0 || direction !== null);
    const code: unknown = codes?.[i],
      day: unknown = days?.[i];
    supplied.set(time * 1000, {
      at: new Date(time * 1000).toISOString(),
      gustMps: optionalNumber("wind_gusts_10m", "m/s", i, 150),
      precipitationMm: optionalNumber("precipitation", "mm", i, 1000),
      precipitationProbabilityPct: optionalNumber(
        "precipitation_probability",
        "%",
        i,
        100,
      ),
      speedMps: usable ? speed : null,
      fromDegrees: usable && speed !== 0 ? direction : null,
      flowDegrees:
        usable && speed !== 0 && direction !== null
          ? (direction + 180) % 360
          : null,
      weatherCode:
        typeof code === "number" &&
        Number.isInteger(code) &&
        code >= 0 &&
        code <= 99
          ? code
          : null,
      isDay:
        day === 1 || day === true
          ? true
          : day === 0 || day === false
            ? false
            : null,
    });
  });
  // Keep missing hours in their actual slider positions; never invent calm wind.
  return Array.from(
    { length: 48 },
    (_, i) =>
      supplied.get(start + i * hourMs) ?? {
        at: new Date(start + i * hourMs).toISOString(),
        speedMps: null,
        fromDegrees: null,
        flowDegrees: null,
        weatherCode: null,
        isDay: null,
        gustMps: null,
        precipitationMm: null,
        precipitationProbabilityPct: null,
      },
  );
}
export async function loadRouteWind(
  input: {
    point: unknown;
    independentConfirmed: boolean;
    weatherConsent: boolean;
  },
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<RouteWindForecast> {
  if (input.independentConfirmed !== true || input.weatherConsent !== true)
    throw new Error(
      "Confirm independent source and weather-location sharing first.",
    );
  const point = coordinate.parse(input.point);
  const start = Math.ceil(now.getTime() / hourMs) * hourMs;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(point[1]),
    longitude: String(point[0]),
    hourly:
      "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,weather_code,is_day",
    wind_speed_unit: "ms",
    timeformat: "unixtime",
    timezone: "GMT",
    start_hour: new Date(start).toISOString().slice(0, 16),
    end_hour: new Date(start + 47 * hourMs).toISOString().slice(0, 16),
  }).toString();
  const body = await fetchOpenMeteo(url, {
    service: "Weather service",
    body: "Weather",
    maxBytes: 100_000,
    signal,
    fetcher,
  });
  const hours = parseRouteWind(body, start);
  if (hours.every((h) => h.speedMps === null))
    throw new Error("No usable wind forecast returned.");
  return {
    hours,
    retrievedAt: now.toISOString(),
    expiresAt: now.getTime() + 30 * 60_000,
    point,
  };
}
// Ride effect for a drawn route under one point forecast, for the given rider,
// terrain and shelter (the reference rider on open, flat ground by default).
export function estimateRouteRideEffect(
  points: unknown,
  hour: Pick<RouteWindHour, "speedMps" | "fromDegrees" | "at">,
  retrievedAt?: string,
  rider: Rider = referenceRider,
  terrain?: TerrainProfile | null,
  shelter: Shelter = "exposed",
): RouteRideEffect | null {
  if (hour.speedMps === null) return null;
  if (terrain === null) return null;
  if (!isShelter(shelter)) return null;
  try {
    const geometryLegs = terrain
      ? prepareTerrain(points, terrain).legs
      : prepareGeometry({
          type: "LineString",
          coordinates: points,
        }).legs;
    const legs = geometryLegs.map((leg) => {
      const wind = projectWind(
        hour.speedMps,
        hour.fromDegrees,
        leg.bearingDegrees,
      );
      return {
        distanceM: leg.distanceM,
        tailwindMps: wind.tailwindMps,
        crosswindMps: wind.crosswindMps,
        grade: "grade" in leg ? leg.grade : 0,
      };
    });
    const lead =
      retrievedAt === undefined
        ? undefined
        : Math.max(
            0,
            (Date.parse(hour.at) - Date.parse(retrievedAt)) / 3_600_000,
          );
    const exposed = terrain
      ? estimateTerrainEffect(legs, rider, lead)
      : estimateRideEffect(legs, rider, { leadHours: lead });
    const factor = shelterPresets[shelter].windFactor;
    const shelteredLegs = legs.map((leg) => ({
      ...leg,
      tailwindMps: leg.tailwindMps * factor,
      crosswindMps: leg.crosswindMps * factor,
    }));
    const effect =
      shelter === "exposed"
        ? exposed
        : terrain
          ? estimateTerrainEffect(shelteredLegs, rider, lead)
          : estimateRideEffect(shelteredLegs, rider, { leadHours: lead });
    if (effect.band && exposed.band && shelter !== "exposed") {
      effect.band = {
        ...effect.band,
        speedDeltaLowMps: Math.min(
          effect.band.speedDeltaLowMps,
          exposed.band.speedDeltaLowMps,
        ),
        speedDeltaHighMps: Math.max(
          effect.band.speedDeltaHighMps,
          exposed.band.speedDeltaHighMps,
        ),
      };
    }
    const distanceM = legs.reduce((total, leg) => total + leg.distanceM, 0);
    return {
      ...effect,
      shelter,
      shelterVersion: "manual-shelter-v1",
      exposedTimeS: distanceM / exposed.windSpeedMps,
      calmTimeS: distanceM / effect.calmSpeedMps,
      windTimeS: distanceM / effect.windSpeedMps,
      timeRange: effect.band
        ? {
            lowS:
              distanceM / (effect.calmSpeedMps + effect.band.speedDeltaHighMps),
            highS:
              distanceM / (effect.calmSpeedMps + effect.band.speedDeltaLowMps),
          }
        : null,
    };
  } catch {
    return null;
  }
}
export type RouteRideEffect = (RideEffect | TerrainEffect) & {
  shelter?: Shelter;
  shelterVersion?: "manual-shelter-v1";
  exposedTimeS?: number;
  calmTimeS: number;
  windTimeS: number;
  timeRange: { lowS: number; highS: number } | null;
};
