import { z } from "zod";
import {
  forecastRequest,
  forecastSnapshot,
  weatherHour,
  utcInstant,
  type ForecastRequest,
  type ForecastResult,
  type ForecastSnapshot,
  type WeatherFailure,
  type Provenance,
} from "@scout/contracts";

export interface WeatherProvider {
  getForecast(request: ForecastRequest): Promise<ForecastResult>;
}
export const weatherAttribution = {
  label: "Weather data by Open-Meteo.com",
  url: "https://open-meteo.com/",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  changes:
    "Units normalized to SI; hourly data selected and joined to synthetic route samples.",
} as const;
export const FRESH_MS = 30 * 60 * 1000;
export const RETENTION_MS = 6 * 3600000;
const HOUR_MS = 3600000;
const MAX_BODY_BYTES = 2_000_000;
export const iso = (ms: number) =>
  new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(".000", "");
export const hourlyInstants = (window: ForecastRequest["window"]) => {
  const result: string[] = [];
  for (
    let t = Math.ceil(Date.parse(window.startAt) / HOUR_MS) * HOUR_MS;
    t < Date.parse(window.endAt);
    t += HOUR_MS
  )
    result.push(iso(t));
  return result;
};
export function defaultForecastWindow(now: Date) {
  const start = Math.ceil(now.getTime() / HOUR_MS) * HOUR_MS;
  return { startAt: iso(start), endAt: iso(start + 48 * HOUR_MS) };
}
export class WeatherError extends Error {
  constructor(
    readonly code: WeatherFailure["code"],
    readonly retryAt: string | null = null,
    readonly retryable = false,
  ) {
    super(code);
  }
}
const numericColumn = z.array(z.number().nullable()).max(48).optional();
const rawSnapshot = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number().nullable().optional(),
  timezone: z.enum(["GMT", "UTC"]),
  utc_offset_seconds: z.literal(0),
  hourly_units: z.record(z.string(), z.string()),
  hourly: z.object({
    time: z.array(z.string()).min(1).max(48),
    wind_speed_10m: numericColumn,
    wind_direction_10m: numericColumn,
    wind_gusts_10m: numericColumn,
    precipitation: numericColumn,
    precipitation_probability: numericColumn,
    temperature_2m: numericColumn,
  }),
});
const fields = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "precipitation",
  "precipitation_probability",
  "temperature_2m",
] as const;
export function normalizeForecast(
  payload: unknown,
  request: ForecastRequest,
  retrievedMs: number,
  mode: "synthetic" | "live",
): ForecastSnapshot[] {
  const list = Array.isArray(payload) ? payload : [payload];
  if (list.length !== request.points.length)
    throw new WeatherError("FORECAST_UNAVAILABLE");
  return list.map((value, index) => {
    const parsed = rawSnapshot.safeParse(value);
    if (!parsed.success) throw new WeatherError("FORECAST_UNAVAILABLE");
    const raw = parsed.data;
    const units = raw.hourly_units;
    if (units.time !== "iso8601")
      throw new WeatherError("FORECAST_UNAVAILABLE");
    const speedFactor = (field: string) => {
      const unit = units[field];
      if (unit === "m/s") return 1;
      if (unit === "km/h") return 1 / 3.6;
      if (unit === "mp/h" || unit === "mph") return 0.44704;
      if (unit === "kn") return 0.5144444444444445;
      throw new WeatherError("FORECAST_UNAVAILABLE");
    };
    for (const f of fields)
      if (
        raw.hourly[f] !== undefined &&
        raw.hourly[f].length !== raw.hourly.time.length
      )
        throw new WeatherError("FORECAST_UNAVAILABLE");
    const windFactor =
      raw.hourly.wind_speed_10m === undefined
        ? 1
        : speedFactor("wind_speed_10m");
    const gustFactor =
      raw.hourly.wind_gusts_10m === undefined
        ? 1
        : speedFactor("wind_gusts_10m");
    if (
      (raw.hourly.wind_direction_10m && units.wind_direction_10m !== "°") ||
      (raw.hourly.precipitation_probability &&
        units.precipitation_probability !== "%") ||
      (raw.hourly.precipitation &&
        !["mm", "inch"].includes(units.precipitation ?? "")) ||
      (raw.hourly.temperature_2m &&
        !["°C", "°F"].includes(units.temperature_2m ?? ""))
    )
      throw new WeatherError("FORECAST_UNAVAILABLE");
    const p: Provenance = {
      sourceKind: mode === "live" ? "open-meteo" : "synthetic",
      sourceId: mode === "live" ? "open-meteo-demo-v1" : "demo-v1",
      retrievedAt: iso(retrievedMs),
      expiresAt: iso(retrievedMs + RETENTION_MS),
      attribution:
        mode === "live"
          ? weatherAttribution
          : {
              ...weatherAttribution,
              label: "Synthetic weather fixture; Open-Meteo-compatible format",
              changes:
                "Invented values; not downloaded observations or a current forecast.",
            },
      policy: {
        decisionId: mode === "live" ? "open-meteo-demo-v1" : "synthetic-v1",
        analysis: true,
        persistence: true,
        derivedOutputs: true,
        aiDisclosure: true,
      },
    };
    let previous = "";
    const all = raw.hourly.time.map((time, i) => {
      const validAt = /^\d{4}-\d\d-\d\dT\d\d:00$/.test(time)
        ? `${time}:00Z`
        : time;
      if (
        !utcInstant.safeParse(validAt).success ||
        !validAt.endsWith(":00:00Z") ||
        validAt <= previous
      )
        throw new WeatherError("FORECAST_UNAVAILABLE");
      previous = validAt;
      const v = (f: (typeof fields)[number]) => raw.hourly[f]?.[i] ?? null;
      const convert = (n: number | null, factor: number) =>
        n === null ? null : n * factor;
      const dir = v("wind_direction_10m");
      const temp = v("temperature_2m");
      const result = weatherHour.safeParse({
        validAt,
        windSpeedMps: convert(v("wind_speed_10m"), windFactor),
        windFromDegrees: dir === 360 ? 0 : dir,
        gustMps: convert(v("wind_gusts_10m"), gustFactor),
        precipitationMm: convert(
          v("precipitation"),
          units.precipitation === "inch" ? 25.4 : 1,
        ),
        precipitationProbabilityPct: v("precipitation_probability"),
        temperatureC:
          temp === null
            ? null
            : units.temperature_2m === "°F"
              ? ((temp - 32) * 5) / 9
              : temp,
        provenance: p,
      });
      if (!result.success) throw new WeatherError("FORECAST_UNAVAILABLE");
      return result.data;
    });
    const hours = all.filter(
      (h) =>
        h.validAt >= request.window.startAt && h.validAt < request.window.endAt,
    );
    const expected = hourlyInstants(request.window);
    return forecastSnapshot.parse({
      provenance: p,
      requestedCoordinate: request.points[index],
      gridCoordinate: [raw.longitude, raw.latitude],
      retrievedAt: p.retrievedAt,
      freshUntil: iso(retrievedMs + FRESH_MS),
      expiresAt: p.expiresAt,
      metadata: {
        requestedModel: "best_match",
        model: null,
        modelIssuedAt: null,
        elevationM: raw.elevation ?? null,
        timezone: raw.timezone,
        utcOffsetSeconds: 0,
      },
      hours,
      attribution:
        mode === "live"
          ? weatherAttribution
          : {
              ...weatherAttribution,
              label: "Synthetic weather fixture; Open-Meteo-compatible format",
              changes:
                "Invented values; not downloaded observations or a current forecast.",
            },
      warnings: [
        ...(mode === "synthetic" ? ["SYNTHETIC_WEATHER"] : []),
        ...(hours.length !== expected.length ? ["PARTIAL_COVERAGE"] : []),
      ],
    });
  });
}

type Dependencies = {
  fetch: typeof fetch;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
};
const defaultDependencies: Dependencies = {
  fetch: globalThis.fetch,
  now: Date.now,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
};
export class OpenMeteoProvider implements WeatherProvider {
  private readonly deps: Dependencies;
  private readonly cache = new Map<
    string,
    { storedAt: number; snapshots: ForecastSnapshot[] }
  >();
  private readonly pending = new Map<string, Promise<ForecastResult>>();
  private blockedUntil = 0;
  constructor(
    private readonly mode: "disabled" | "synthetic" | "live-demo" = "disabled",
    dependencies: Partial<Dependencies> = {},
  ) {
    this.deps = { ...defaultDependencies, ...dependencies };
    if (mode === "synthetic" && !dependencies.fetch)
      throw new Error(
        "Synthetic replay requires an explicit fixture transport",
      );
  }
  async getForecast(input: ForecastRequest): Promise<ForecastResult> {
    const parsed = forecastRequest.safeParse(input);
    if (!parsed.success) return this.failure("OUTSIDE_FORECAST_RANGE");
    const request = parsed.data;
    if (
      this.mode === "disabled" ||
      (this.mode === "live-demo" &&
        request.points.some(
          ([lon, lat]) =>
            lon < -0.001 || lon > 0.011 || lat < 50.999 || lat > 51.011,
        ))
    )
      return this.failure("SOURCE_NOT_PERMITTED");
    const instants = hourlyInstants(request.window);
    if (!instants.length) return this.failure("OUTSIDE_FORECAST_RANGE");
    const now = this.deps.now();
    if (
      this.mode === "live-demo" &&
      (Date.parse(request.window.startAt) <
        Math.floor(now / HOUR_MS) * HOUR_MS ||
        Date.parse(request.window.endAt) > now + 16 * 24 * HOUR_MS)
    )
      return this.failure("OUTSIDE_FORECAST_RANGE");
    for (const [key, entry] of this.cache)
      if (now - entry.storedAt >= RETENTION_MS || now < entry.storedAt)
        this.cache.delete(key);
    const key = JSON.stringify(request);
    const cached = this.cache.get(key);
    if (cached && now - cached.storedAt < FRESH_MS)
      return structuredClone({
        status: "fresh",
        snapshots: cached.snapshots,
        error: null,
      });
    const pending = this.pending.get(key);
    if (pending) return structuredClone(await pending);
    if (this.pending.size >= 4)
      return this.fallback(cached, "RATE_LIMITED", iso(now + 1000));
    const job = this.refresh(request, key, cached);
    this.pending.set(key, job);
    try {
      return structuredClone(await job);
    } finally {
      this.pending.delete(key);
    }
  }
  private failure(
    code: WeatherFailure["code"],
    retryAt: string | null = null,
  ): ForecastResult {
    return { status: "unavailable", snapshots: [], error: { code, retryAt } };
  }
  private fallback(
    cached: { storedAt: number; snapshots: ForecastSnapshot[] } | undefined,
    code: WeatherFailure["code"],
    retryAt: string | null,
  ): ForecastResult {
    return cached && this.deps.now() - cached.storedAt < RETENTION_MS
      ? {
          status: "stale",
          snapshots: cached.snapshots,
          error: { code, retryAt },
        }
      : this.failure(code, retryAt);
  }
  private async refresh(
    request: ForecastRequest,
    key: string,
    cached: { storedAt: number; snapshots: ForecastSnapshot[] } | undefined,
  ): Promise<ForecastResult> {
    let failure = new WeatherError("FORECAST_UNAVAILABLE");
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.blockedUntil > this.deps.now())
        return this.fallback(cached, "RATE_LIMITED", iso(this.blockedUntil));
      try {
        const payload = await this.request(request);
        const storedAt = Math.floor(this.deps.now() / 1000) * 1000;
        const snapshots = normalizeForecast(
          payload,
          request,
          storedAt,
          this.mode === "live-demo" ? "live" : "synthetic",
        );
        if (!snapshots.some((s) => s.hours.length))
          throw new WeatherError("OUTSIDE_FORECAST_RANGE");
        if (this.cache.size >= 64 && !this.cache.has(key))
          this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, { storedAt, snapshots });
        return { status: "fresh", snapshots, error: null };
      } catch (e) {
        failure =
          e instanceof WeatherError
            ? e
            : new WeatherError("FORECAST_UNAVAILABLE", null, true);
        if (!failure.retryable || attempt === 2) break;
        const retryMs =
          failure.retryAt === null
            ? 0
            : Math.max(0, Date.parse(failure.retryAt) - this.deps.now());
        if (retryMs > 5000) break;
        const jitter = Math.floor(
          Math.max(0, Math.min(1, this.deps.random())) * 250,
        );
        await this.deps.sleep(Math.max(retryMs, 250 * 2 ** attempt + jitter));
      }
    }
    return this.fallback(cached, failure.code, failure.retryAt);
  }
  private async request(request: ForecastRequest): Promise<unknown> {
    const instants = hourlyInstants(request.window);
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    const params = {
      latitude: request.points.map((p) => p[1]).join(","),
      longitude: request.points.map((p) => p[0]).join(","),
      hourly: fields.join(","),
      wind_speed_unit: "ms",
      precipitation_unit: "mm",
      temperature_unit: "celsius",
      timezone: "GMT",
      timeformat: "iso8601",
      models: "best_match",
      start_hour: instants[0]!.slice(0, 16),
      end_hour: instants.at(-1)!.slice(0, 16),
    };
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new WeatherError("FORECAST_UNAVAILABLE", null, true));
      }, 5000);
    });
    try {
      return await Promise.race([
        timeout,
        (async () => {
          const response = await this.deps.fetch(url, {
            signal: controller.signal,
            redirect: "error",
          });
          if (!response.ok) {
            if (response.status === 429) {
              const header = response.headers.get("retry-after");
              const seconds =
                header !== null && /^\d+$/.test(header) ? Number(header) : NaN;
              const deadline = Number.isFinite(seconds)
                ? this.deps.now() + seconds * 1000
                : header
                  ? Date.parse(header)
                  : NaN;
              const retryMs =
                Number.isFinite(deadline) &&
                deadline >= this.deps.now() &&
                deadline < 8.64e15
                  ? deadline
                  : this.deps.now() + 60000;
              this.blockedUntil = retryMs;
              throw new WeatherError("RATE_LIMITED", iso(retryMs), true);
            }
            throw new WeatherError(
              "FORECAST_UNAVAILABLE",
              null,
              response.status >= 500,
            );
          }
          if (
            !response.body ||
            Number(response.headers.get("content-length")) > MAX_BODY_BYTES
          )
            throw new WeatherError("FORECAST_UNAVAILABLE");
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let size = 0;
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              size += value.byteLength;
              if (size > MAX_BODY_BYTES) {
                await reader.cancel();
                throw new WeatherError("FORECAST_UNAVAILABLE");
              }
              chunks.push(value);
            }
          } finally {
            reader.releaseLock();
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          try {
            return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
          } catch {
            throw new WeatherError("FORECAST_UNAVAILABLE");
          }
        })(),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      controller.abort();
    }
  }
}
