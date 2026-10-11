// One source of Open-Meteo test responses for every level: pure builders plus
// recorded fixtures validated against the contract schemas.
import {
  openMeteoArchiveResponse,
  openMeteoElevationResponse,
  openMeteoForecastResponse,
  openMeteoForecastResponses,
  type OpenMeteoArchiveResponse,
  type OpenMeteoElevationResponse,
  type OpenMeteoForecastResponse,
} from "@scout/contracts";
import forecastFixture from "../fixtures/open-meteo/forecast.json" with { type: "json" };
import forecastIsoFixture from "../fixtures/open-meteo/forecast-iso.json" with { type: "json" };
import elevationFixture from "../fixtures/open-meteo/elevation.json" with { type: "json" };
import archiveFixture from "../fixtures/open-meteo/archive.json" with { type: "json" };

export const openMeteoHosts = {
  forecast: "https://api.open-meteo.com/v1/forecast",
  elevation: "https://api.open-meteo.com/v1/elevation",
  archive: "https://archive-api.open-meteo.com/v1/archive",
} as const;

export type WeatherFault = "ok" | "outage" | "rateLimit" | "empty" | "timeout";
export type ElevationFault = "ok" | "incomplete" | "outage";
export type ArchiveFault = "ok" | "outage" | "rateLimit";
export type HourOverride = Partial<{
  speed: number | null;
  direction: number | null;
  gust: number | null;
  precipitation: number | null;
  probability: number | null;
  code: number;
  isDay: 0 | 1;
}>;
export type OpenMeteoConfig = {
  faults: {
    weather: WeatherFault;
    elevation: ElevationFault;
    archive: ArchiveFault;
  };
  wind: { speed: number; direction: number; gust: number | null };
  /** Steady past wind returned by the archive endpoint. */
  archive: { speed: number; direction: number };
  /** Per-hour overrides by slider index, applied over `wind`. */
  hours: Record<number, HourOverride>;
  /** Metres above sea level along a northbound line; the default rises 4 m per 100 m. */
  elevationAt: (latitude: number, index: number) => number | null;
};
export function defaultOpenMeteoConfig(): OpenMeteoConfig {
  return {
    faults: { weather: "ok", elevation: "ok", archive: "ok" },
    wind: { speed: 4, direction: 180, gust: null },
    archive: { speed: 5, direction: 200 },
    hours: {},
    elevationAt: (latitude) => 50 + (latitude - 51.5) * 111195 * 0.04,
  };
}

/** Browser-path forecast body: unix times, m/s, 48 rows from `startS`. */
export function forecastBody(
  config: OpenMeteoConfig,
  startS: number,
): OpenMeteoForecastResponse {
  const pick = <K extends keyof HourOverride>(
    index: number,
    key: K,
    fallback: NonNullable<HourOverride[K]> | null,
  ) => {
    const override = config.hours[index];
    return override && key in override ? override[key]! : fallback;
  };
  const column = <T>(pickAt: (index: number) => T) =>
    Array.from({ length: 48 }, (_, index) => pickAt(index));
  const withGust = config.wind.gust !== null;
  return {
    latitude: 51.5,
    longitude: -0.12,
    generationtime_ms: 0.1,
    utc_offset_seconds: 0,
    timezone: "GMT",
    timezone_abbreviation: "GMT",
    elevation: 1,
    hourly_units: {
      time: "unixtime",
      wind_speed_10m: "m/s",
      wind_direction_10m: "°",
      ...(withGust ? { wind_gusts_10m: "m/s" } : {}),
      precipitation: "mm",
      precipitation_probability: "%",
      weather_code: "wmo code",
      is_day: "",
    },
    hourly: {
      time: column((index) => startS + index * 3600),
      wind_speed_10m: column((index) =>
        pick(index, "speed", config.wind.speed),
      ),
      wind_direction_10m: column((index) =>
        pick(index, "direction", config.wind.direction),
      ),
      ...(withGust
        ? {
            wind_gusts_10m: column((index) =>
              pick(index, "gust", config.wind.gust),
            ),
          }
        : {}),
      precipitation: column((index) => pick(index, "precipitation", 0)),
      precipitation_probability: column((index) =>
        pick(index, "probability", 20),
      ),
      weather_code: column((index) => pick(index, "code", 0)),
      is_day: column((index) => pick(index, "isDay", 1)),
    },
  };
}

export function elevationBody(
  config: OpenMeteoConfig,
  latitudes: number[],
): OpenMeteoElevationResponse {
  return {
    elevation: latitudes.map((latitude, index) =>
      config.faults.elevation === "incomplete" && index === 1
        ? (null as unknown as number)
        : config.elevationAt(latitude, index)!,
    ),
  };
}

/** Archive body: unix times, whole UTC days from start_date to end_date inclusive. */
export function archiveBody(
  config: OpenMeteoConfig,
  startDate: string,
  endDate: string,
): OpenMeteoArchiveResponse {
  const first = Date.parse(`${startDate}T00:00:00Z`) / 1000;
  const last = Date.parse(`${endDate}T00:00:00Z`) / 1000;
  const length = Math.round((last - first) / 86_400 + 1) * 24;
  const column = <T>(pick: (index: number) => T) =>
    Array.from({ length }, (_, index) => pick(index));
  return {
    latitude: 51.5,
    longitude: -0.12,
    generationtime_ms: 0.1,
    utc_offset_seconds: 0,
    timezone: "GMT",
    timezone_abbreviation: "GMT",
    elevation: 1,
    hourly_units: {
      time: "unixtime",
      wind_speed_10m: "m/s",
      wind_direction_10m: "°",
      wind_gusts_10m: "m/s",
      precipitation: "mm",
    },
    hourly: {
      time: column((index) => first + index * 3600),
      wind_speed_10m: column(() => config.archive.speed),
      wind_direction_10m: column(() => config.archive.direction),
      wind_gusts_10m: column(() => config.archive.speed * 1.6),
      precipitation: column(() => 0),
    },
  };
}
export const archiveDatesFrom = (url: string) => {
  const params = new URL(url).searchParams;
  return { start: params.get("start_date")!, end: params.get("end_date")! };
};

export const startHourFrom = (url: string) =>
  Date.parse(new URL(url).searchParams.get("start_hour")! + ":00Z") / 1000;
export const latitudesFrom = (url: string) =>
  new URL(url).searchParams.get("latitude")!.split(",").map(Number);

export type Recorded = {
  forecast: OpenMeteoForecastResponse;
  forecastIso: OpenMeteoForecastResponse[];
  elevation: OpenMeteoElevationResponse;
  archive: OpenMeteoArchiveResponse;
};
/** Recorded live responses, parsed through the contract schemas on first use. */
export function recorded(): Recorded {
  const iso = openMeteoForecastResponses.parse(forecastIsoFixture);
  return {
    forecast: openMeteoForecastResponse.parse(forecastFixture),
    forecastIso: Array.isArray(iso) ? iso : [iso],
    elevation: openMeteoElevationResponse.parse(elevationFixture),
    archive: openMeteoArchiveResponse.parse(archiveFixture),
  };
}
/** The recorded forecast's first unix hour, so parsers can be given a matching clock. */
export const recordedForecastStartS = () =>
  Number(recorded().forecast.hourly.time[0]);
