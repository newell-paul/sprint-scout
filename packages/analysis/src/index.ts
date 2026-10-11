import { distance } from "@turf/distance";
import { bearing } from "@turf/bearing";
import { destination } from "@turf/destination";
import { estimateRideEffect, type RideEffect } from "./ride-effect";
export * from "./ride-effect";
export * from "./terrain-effect";
import {
  coordinate,
  segment,
  weatherHour,
  utcInstant,
  type Provenance,
} from "@scout/contracts";

export const algorithmVersion = "wind-v1" as const;
export const limits = {
  segments: 50,
  hours: 48,
  points: 10000,
  legs: 2000,
} as const;
export class AnalysisError extends Error {
  readonly algorithmVersion = algorithmVersion;
  constructor(
    readonly code:
      | "GEOMETRY_INVALID"
      | "FORECAST_UNAVAILABLE"
      | "OUTSIDE_FORECAST_RANGE"
      | "CAPABILITY_UNAVAILABLE",
    message: string,
  ) {
    super(message);
  }
}
export type Coordinate = [number, number];
export type Leg = {
  start: Coordinate;
  end: Coordinate;
  distanceM: number;
  bearingDegrees: number;
};
export type Geometry = {
  algorithmVersion: typeof algorithmVersion;
  legs: Leg[];
  lengthM: number;
};
const radians = (n: number) => (n * Math.PI) / 180;
export function prepareGeometry(input: unknown, maxLegM = 100): Geometry {
  const parsed = segment.shape.geometry.safeParse(input);
  if (
    !parsed.success ||
    !Number.isFinite(maxLegM) ||
    maxLegM < 1 ||
    maxLegM > 100
  )
    throw new AnalysisError(
      "GEOMETRY_INVALID",
      "Expected a bounded directed LineString and sampling distance from 1 to 100 m",
    );
  const points = parsed.data.coordinates.filter(
    (p, i, all) =>
      i === 0 || p[0] !== all[i - 1]?.[0] || p[1] !== all[i - 1]?.[1],
  );
  const legs: Leg[] = [];
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1]!;
    const end = points[i]!;
    const length = distance(start, end, { units: "meters" });
    if (length < 1e-6) continue;
    const count = Math.ceil(length / maxLegM);
    if (legs.length + count > limits.legs)
      throw new AnalysisError(
        "GEOMETRY_INVALID",
        "Sampled geometry exceeds 2000 legs",
      );
    const forward = bearing(start, end);
    let previous = start;
    for (let j = 1; j <= count; j++) {
      const raw =
        j === count
          ? end
          : destination(start, (length * j) / count, forward, {
              units: "meters",
            }).geometry.coordinates;
      const next = coordinate.parse([((raw[0]! + 540) % 360) - 180, raw[1]!]);
      const d = distance(previous, next, { units: "meters" });
      legs.push({
        start: previous,
        end: next,
        distanceM: d,
        bearingDegrees: (bearing(previous, next) + 360) % 360,
      });
      previous = next;
    }
  }
  if (legs.length === 0)
    throw new AnalysisError("GEOMETRY_INVALID", "Geometry has no nonzero legs");
  return {
    algorithmVersion,
    legs,
    lengthM: legs.reduce((sum, leg) => sum + leg.distanceM, 0),
  };
}
export function projectWind(
  speed: number | null,
  from: number | null,
  forward: number,
) {
  if (
    speed === null ||
    !Number.isFinite(speed) ||
    speed < 0 ||
    !Number.isFinite(forward) ||
    (from !== null && (!Number.isFinite(from) || from < 0 || from >= 360)) ||
    (speed !== 0 && from === null)
  )
    throw new AnalysisError(
      "FORECAST_UNAVAILABLE",
      "Valid wind speed and direction are required unless calm",
    );
  const w = radians(((from ?? 0) + 180) % 360);
  const b = radians(forward);
  const east = speed * Math.sin(w);
  const north = speed * Math.cos(w);
  return {
    algorithmVersion,
    tailwindMps: east * Math.sin(b) + north * Math.cos(b),
    crosswindMps: east * Math.cos(b) - north * Math.sin(b),
  };
}
export type IndexConfig = { offsetMps: number; spanMps: number };
export const defaultIndex: IndexConfig = { offsetMps: 5, spanMps: 10 };
export function weatherIndex(
  tailwindMps: number,
  config: IndexConfig = defaultIndex,
) {
  if (
    ![tailwindMps, config.offsetMps, config.spanMps].every(Number.isFinite) ||
    config.spanMps <= 0
  )
    throw new AnalysisError(
      "CAPABILITY_UNAVAILABLE",
      "Invalid index configuration",
    );
  return (
    100 *
    Math.max(0, Math.min(1, (tailwindMps + config.offsetMps) / config.spanMps))
  );
}
export type Weather = ReturnType<typeof weatherHour.parse>;
export type Thresholds = {
  gustMps?: number;
  crosswindMps?: number;
  precipitationMm?: number;
};
export type Opportunity = {
  algorithmVersion: typeof algorithmVersion;
  segmentId: string;
  attemptAt: string;
  timeZone: string;
  tailwindMps: number;
  meanAbsCrosswindMps: number;
  maxAbsCrosswindMps: number;
  worstHeadwindMps: number;
  tailwindFraction: number;
  gustMps: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  weatherIndex: number;
  indexConfig: IndexConfig;
  warnings: string[];
  caution: boolean;
  dataQuality: "complete" | "incomplete";
  retrievedAt: string;
  sources: Provenance[];
  prediction: null;
  predictionReason: string;
  limitations: string;
  rideEffect: RideEffect;
  legs: (Leg & {
    tailwindMps: number;
    crosswindMps: number;
    algorithmVersion: typeof algorithmVersion;
  })[];
};
// Weather must explicitly cover the entire segment or supply one observation per prepared leg.
export type Slot = {
  attemptAt: string;
  weather:
    { scope: "segment"; hour: unknown } | { scope: "legs"; hours: unknown[] };
};
export type Candidate = {
  segmentId: string;
  geometry: unknown;
  source: unknown;
  slots: Slot[];
};
export type Options = {
  startAt: string;
  endAt: string;
  timeZone: string;
  limit?: number;
  segmentIds?: string[];
  minTailwindMps?: number;
  thresholds?: Thresholds;
  indexConfig?: IndexConfig;
};
export function evaluateHour(
  geometry: Geometry,
  hours: Weather[],
  segmentId: string,
  source: Provenance,
  options: Options,
): Opportunity {
  if (hours.length !== geometry.legs.length || hours.length === 0)
    throw new AnalysisError(
      "FORECAST_UNAVAILABLE",
      "Weather coverage must match every leg",
    );
  const first = hours[0]!;
  if (hours.some((h) => h.validAt !== first.validAt))
    throw new AnalysisError(
      "OUTSIDE_FORECAST_RANGE",
      "All leg observations must share the attempt hour",
    );
  const legs = geometry.legs.map((leg, i) => ({
    ...leg,
    ...projectWind(
      hours[i]!.windSpeedMps,
      hours[i]!.windFromDegrees,
      leg.bearingDegrees,
    ),
  }));
  const weighted = (f: (leg: (typeof legs)[number]) => number) =>
    legs.reduce((s, l) => s + l.distanceM * f(l), 0) / geometry.lengthM;
  const tailwindMps = weighted((l) => l.tailwindMps);
  const maxAbsCrosswindMps = Math.max(
    ...legs.map((l) => Math.abs(l.crosswindMps)),
  );
  const maximum = (
    field: "gustMps" | "precipitationMm" | "precipitationProbabilityPct",
  ) =>
    hours.some((h) => h[field] === null)
      ? null
      : Math.max(...hours.map((h) => h[field]!));
  const gustMps = maximum("gustMps"),
    precipitationMm = maximum("precipitationMm"),
    precipitationProbabilityPct = maximum("precipitationProbabilityPct");
  const warnings: string[] = [];
  const {
    gustMps: gustThreshold,
    crosswindMps: crossThreshold,
    precipitationMm: rainThreshold,
  } = options.thresholds ?? {};
  // Known breaches are retained even when another spatial sample is missing.
  if (
    gustThreshold !== undefined &&
    hours.some((h) => h.gustMps !== null && h.gustMps > gustThreshold)
  )
    warnings.push("GUST_THRESHOLD");
  if (crossThreshold !== undefined && maxAbsCrosswindMps > crossThreshold)
    warnings.push("CROSSWIND_THRESHOLD");
  if (
    rainThreshold !== undefined &&
    hours.some(
      (h) => h.precipitationMm !== null && h.precipitationMm > rainThreshold,
    )
  )
    warnings.push("RAIN_THRESHOLD");
  const caution = warnings.length > 0;
  const retrievedAt = hours.map((h) => h.provenance.retrievedAt).sort()[0]!;
  const incomplete = hours.some(
    (h) =>
      h.gustMps === null ||
      h.precipitationMm === null ||
      h.precipitationProbabilityPct === null ||
      h.temperatureC === null,
  );
  if (incomplete) warnings.push("INCOMPLETE_WEATHER");
  return {
    algorithmVersion,
    segmentId,
    attemptAt: first.validAt,
    timeZone: options.timeZone,
    tailwindMps,
    meanAbsCrosswindMps: weighted((l) => Math.abs(l.crosswindMps)),
    maxAbsCrosswindMps,
    worstHeadwindMps: Math.min(0, ...legs.map((l) => l.tailwindMps)),
    tailwindFraction: weighted((l) => (l.tailwindMps > 0.5 ? 1 : 0)),
    gustMps,
    precipitationMm,
    precipitationProbabilityPct,
    weatherIndex: weatherIndex(tailwindMps, options.indexConfig),
    indexConfig: { ...(options.indexConfig ?? defaultIndex) },
    warnings,
    caution,
    dataQuality: incomplete ? "incomplete" : "complete",
    retrievedAt,
    sources: [
      source,
      ...hours
        .map((h) => h.provenance)
        .filter(
          (p, i, all) =>
            all.findIndex((q) => JSON.stringify(q) === JSON.stringify(p)) === i,
        ),
    ],
    prediction: null,
    predictionReason:
      "Performance estimates are deferred; wind index is not a PR probability.",
    limitations:
      "Forecast wind is a coarse proxy; shelter and terrain are unmodelled. Entire traversal uses the attempt hour. Ride effect assumes a reference rider holding 40 km/h in calm air on flat road, with forecast wind scaled to handlebar height.",
    rideEffect: estimateRideEffect(legs, undefined, {
      leadHours: Math.max(
        0,
        (Date.parse(first.validAt) - Date.parse(retrievedAt)) / 3_600_000,
      ),
    }),
    legs,
  };
}
const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function rankOpportunities(
  rows: readonly Opportunity[],
  limit = 5,
): Opportunity[] {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > limits.segments ||
    rows.length > limits.segments * limits.hours
  )
    throw new AnalysisError(
      "CAPABILITY_UNAVAILABLE",
      "Ranking bounds exceeded",
    );
  const sorted = [...rows].sort(
    (a, b) =>
      Number(a.caution) - Number(b.caution) ||
      b.weatherIndex - a.weatherIndex ||
      a.meanAbsCrosswindMps - b.meanAbsCrosswindMps ||
      (a.precipitationMm === null
        ? b.precipitationMm === null
          ? 0
          : 1
        : b.precipitationMm === null
          ? -1
          : a.precipitationMm - b.precipitationMm) ||
      lexical(a.attemptAt, b.attemptAt) ||
      lexical(a.segmentId, b.segmentId),
  );
  const seen = new Set<string>();
  return sorted
    .filter((row) => {
      if (seen.has(row.segmentId)) return false;
      seen.add(row.segmentId);
      return true;
    })
    .slice(0, limit);
}
export function validateOptions(
  options: Options,
  candidates: readonly Candidate[],
) {
  if (
    !utcInstant.safeParse(options.startAt).success ||
    !utcInstant.safeParse(options.endAt).success ||
    options.endAt <= options.startAt ||
    Date.parse(options.endAt) - Date.parse(options.startAt) >
      limits.hours * 3600000 ||
    candidates.length > limits.segments ||
    new Set(candidates.map((c) => c.segmentId)).size !== candidates.length ||
    candidates.some(
      (c) =>
        !c.segmentId ||
        c.slots.length > limits.hours ||
        new Set(c.slots.map((s) => s.attemptAt)).size !== c.slots.length,
    ) ||
    (options.segmentIds?.length ?? 0) > limits.segments
  )
    throw new AnalysisError(
      "CAPABILITY_UNAVAILABLE",
      "Invalid or excessive batch/window",
    );
  try {
    new Intl.DateTimeFormat("en", { timeZone: options.timeZone });
  } catch {
    throw new AnalysisError(
      "CAPABILITY_UNAVAILABLE",
      "Invalid display time zone",
    );
  }
  for (const n of Object.values(options.thresholds ?? {}))
    if (!Number.isFinite(n) || n < 0)
      throw new AnalysisError(
        "CAPABILITY_UNAVAILABLE",
        "Invalid warning threshold",
      );
  if (
    options.minTailwindMps !== undefined &&
    !Number.isFinite(options.minTailwindMps)
  )
    throw new AnalysisError("CAPABILITY_UNAVAILABLE", "Invalid filter");
  weatherIndex(0, options.indexConfig);
  rankOpportunities([], options.limit);
}
