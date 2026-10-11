// Browser-local past wind for recorded efforts, from the Open-Meteo archive.
// One request per contiguous run of dates, bounded, opt-in, never automatic.
import { coordinate } from "@scout/contracts";

export type ArchiveHour = {
  at: string;
  speedMps: number | null;
  fromDegrees: number | null;
  gustMps: number | null;
  precipitationMm: number | null;
};
export const archiveLimits = { requests: 30, daysPerRequest: 31 } as const;
const hourMs = 3_600_000;
const dayMs = 24 * hourMs;
const dayPattern = /^\d{4}-\d\d-\d\d$/;

function column(
  hourly: Record<string, unknown>,
  units: Record<string, unknown>,
  key: string,
  unit: string,
  length: number,
  maximum: number,
): (number | null)[] {
  const values = hourly[key];
  if (values === undefined) return Array.from({ length }, () => null);
  if (units[key] !== unit || !Array.isArray(values) || values.length !== length)
    throw new Error("Unexpected archive columns or units.");
  return values.map((value: unknown) => {
    if (value === null) return null;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > maximum
    )
      throw new Error("Invalid archive value.");
    return value;
  });
}

/** Validate an archive response covering `days` whole UTC days from `startDate`. */
export function parseArchiveWind(
  input: unknown,
  startDate: string,
  days: number,
): ArchiveHour[] {
  if (!dayPattern.test(startDate) || !Number.isInteger(days) || days < 1)
    throw new Error("Invalid archive range.");
  if (!input || typeof input !== "object")
    throw new Error("Invalid archive response.");
  const v = input as Record<string, unknown>;
  const units = (v.hourly_units ?? {}) as Record<string, unknown>;
  const hourly = (v.hourly ?? {}) as Record<string, unknown>;
  const times = hourly.time;
  const length = days * 24;
  if (v.utc_offset_seconds !== 0 || units.time !== "unixtime")
    throw new Error("Unexpected archive units.");
  const first = Date.parse(`${startDate}T00:00:00Z`) / 1000;
  if (
    !Array.isArray(times) ||
    times.length !== length ||
    times.some((time: unknown, index) => time !== first + index * 3600)
  )
    throw new Error("Archive rows do not cover the requested days.");
  const speeds = column(hourly, units, "wind_speed_10m", "m/s", length, 150);
  const directions = column(
    hourly,
    units,
    "wind_direction_10m",
    "°",
    length,
    360,
  );
  const gusts = column(hourly, units, "wind_gusts_10m", "m/s", length, 150);
  const rain = column(hourly, units, "precipitation", "mm", length, 1000);
  return times.map((time: number, index) => {
    const speed = speeds[index]!;
    const direction = directions[index];
    const usable = speed !== null && (speed === 0 || direction != null);
    return {
      at: new Date(time * 1000).toISOString(),
      speedMps: usable ? speed : null,
      fromDegrees:
        usable && speed !== 0 && direction != null ? direction % 360 : null,
      gustMps: gusts[index]!,
      precipitationMm: rain[index]!,
    };
  });
}

/** Group sorted UTC dates into contiguous runs no longer than the request limit. */
export function dateRanges(
  dates: readonly string[],
): { start: string; days: number }[] {
  const unique = [...new Set(dates)].filter((d) => dayPattern.test(d)).sort();
  const ranges: { start: string; days: number }[] = [];
  for (const date of unique) {
    const last = ranges.at(-1);
    const previous = last
      ? Date.parse(`${last.start}T00:00:00Z`) + (last.days - 1) * dayMs
      : Number.NaN;
    if (
      last &&
      Date.parse(`${date}T00:00:00Z`) === previous + dayMs &&
      last.days < archiveLimits.daysPerRequest
    )
      last.days++;
    else ranges.push({ start: date, days: 1 });
  }
  return ranges;
}

export const utcDate = (instant: string) => instant.slice(0, 10);

/** Split dates into the earliest runs that fit one load and the remainder. */
export function splitDates(dates: readonly string[]): {
  now: string[];
  later: string[];
} {
  const unique = [...new Set(dates)].filter((d) => dayPattern.test(d)).sort();
  const ranges = dateRanges(unique).slice(0, archiveLimits.requests);
  const covered = (date: string) =>
    ranges.some((range) => {
      const start = Date.parse(`${range.start}T00:00:00Z`);
      const day = Date.parse(`${date}T00:00:00Z`);
      return day >= start && day < start + range.days * dayMs;
    });
  return {
    now: unique.filter(covered),
    later: unique.filter((date) => !covered(date)),
  };
}

/** The archive hour that contains `instant`, or null when not loaded. */
export function windAt(
  hours: readonly ArchiveHour[],
  instant: string,
): ArchiveHour | null {
  const floor = Math.floor(Date.parse(instant) / hourMs) * hourMs;
  return hours.find((hour) => Date.parse(hour.at) === floor) ?? null;
}

export async function loadArchiveWind(
  input: { point: unknown; dates: readonly string[]; consent: boolean },
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<{ hours: ArchiveHour[]; retrievedAt: string }> {
  if (input.consent !== true)
    throw new Error(
      "Confirm sharing the segment start and effort dates first.",
    );
  const point = coordinate.parse(input.point);
  const ranges = dateRanges(input.dates);
  if (ranges.length === 0) throw new Error("No effort dates to look up.");
  if (ranges.length > archiveLimits.requests)
    throw new Error(
      `Past wind is limited to ${archiveLimits.requests} date ranges at a time.`,
    );
  const hours: ArchiveHour[] = [];
  for (const range of ranges) {
    signal.throwIfAborted();
    const end = new Date(
      Date.parse(`${range.start}T00:00:00Z`) + (range.days - 1) * dayMs,
    )
      .toISOString()
      .slice(0, 10);
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    url.search = new URLSearchParams({
      latitude: String(point[1]),
      longitude: String(point[0]),
      start_date: range.start,
      end_date: end,
      hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation",
      wind_speed_unit: "ms",
      timeformat: "unixtime",
      timezone: "GMT",
    }).toString();
    const response = await fetcher(url, {
      signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Weather archive rate limit reached. Try again later."
          : "Weather archive unavailable. Try again.",
      );
    const raw = await response.text();
    if (raw.length > 200_000) throw new Error("Archive response is too large.");
    hours.push(...parseArchiveWind(JSON.parse(raw), range.start, range.days));
  }
  return { hours, retrievedAt: now.toISOString() };
}
