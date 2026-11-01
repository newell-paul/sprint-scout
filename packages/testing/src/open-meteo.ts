// One source of Open-Meteo test responses for every level: pure builders plus
// recorded fixtures validated against the contract schemas.
import {
  openMeteoForecastResponse,
  type OpenMeteoForecastResponse,
} from "@scout/contracts";
import forecastFixture from "../fixtures/open-meteo/forecast.json" with { type: "json" };

export const openMeteoHosts = {
  forecast: "https://api.open-meteo.com/v1/forecast",
} as const;

export type WeatherFault = "ok" | "outage" | "rateLimit" | "empty" | "timeout";
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
  };
  wind: { speed: number; direction: number; gust: number | null };
  /** Per-hour overrides by slider index, applied over `wind`. */
  hours: Record<number, HourOverride>;
};
export function defaultOpenMeteoConfig(): OpenMeteoConfig {
  return {
    faults: { weather: "ok" },
    wind: { speed: 4, direction: 180, gust: null },
    hours: {},
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

export const startHourFrom = (url: string) =>
  Date.parse(new URL(url).searchParams.get("start_hour")! + ":00Z") / 1000;

export type Recorded = {
  forecast: OpenMeteoForecastResponse;
};
/** Recorded live responses, parsed through the contract schemas on first use. */
export function recorded(): Recorded {
  return {
    forecast: openMeteoForecastResponse.parse(forecastFixture),
  };
}
/** The recorded forecast's first unix hour, so parsers can be given a matching clock. */
export const recordedForecastStartS = () =>
  Number(recorded().forecast.hourly.time[0]);
