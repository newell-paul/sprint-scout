import { distance } from "@turf/distance";
import { destination } from "@turf/destination";
import {
  prepareGeometry,
  validateOptions,
  AnalysisError,
  algorithmVersion,
  type Candidate,
  type Options,
  type Geometry,
} from "@scout/analysis";
import {
  segment,
  forecastSnapshot,
  type Segment,
  type ForecastResult,
} from "@scout/contracts";
import { hourlyInstants, type WeatherProvider } from "@scout/providers";
import { requirePermission, SourceNotPermitted } from "./policy";
import { analyzeCandidates } from "./wind";

type Sampling = {
  points: [number, number][];
  routes: { segment: Segment; geometry: Geometry; sampleIndices: number[] }[];
  errors: {
    segmentId: string;
    attemptAt: null;
    code: string;
    algorithmVersion: typeof algorithmVersion;
  }[];
};
export function sampleWeatherPoints(
  segments: readonly Segment[],
  now: Date,
): Sampling {
  const result: Sampling = { points: [], routes: [], errors: [] };
  if (
    segments.length > 50 ||
    new Set(segments.map((s) => s.id)).size !== segments.length
  )
    throw new AnalysisError(
      "CAPABILITY_UNAVAILABLE",
      "At most 50 distinct segments",
    );
  for (const input of [...segments].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    const checkpoint = result.points.length;
    try {
      requirePermission(input.provenance, "analysis", now);
      requirePermission(input.provenance, "derivedOutputs", now);
      if (input.provenance.sourceKind !== "synthetic")
        throw new SourceNotPermitted();
      const parsed = segment.safeParse(input);
      if (!parsed.success)
        throw new AnalysisError("GEOMETRY_INVALID", "Invalid route");
      const geometry = prepareGeometry(parsed.data.geometry);
      const sampleIndices = geometry.legs.map((leg) => {
        const p = destination(
          leg.start,
          leg.distanceM / 2,
          leg.bearingDegrees,
          { units: "meters" },
        ).geometry.coordinates;
        const midpoint: [number, number] = [((p[0]! + 540) % 360) - 180, p[1]!];
        let best = -1;
        let bestDistance = 1000;
        result.points.forEach((point, i) => {
          const d = distance(midpoint, point, { units: "meters" });
          if (d <= bestDistance) {
            best = i;
            bestDistance = d;
          }
        });
        if (best !== -1) return best;
        if (result.points.length >= 50)
          throw new AnalysisError(
            "CAPABILITY_UNAVAILABLE",
            "Representative point budget exceeded",
          );
        result.points.push(midpoint);
        return result.points.length - 1;
      });
      result.routes.push({ segment: parsed.data, geometry, sampleIndices });
    } catch (e) {
      result.points.length = checkpoint;
      if (!(e instanceof AnalysisError) && !(e instanceof SourceNotPermitted))
        throw e;
      result.errors.push({
        segmentId: input.id,
        attemptAt: null,
        code: e.code,
        algorithmVersion,
      });
    }
  }
  return result;
}
export async function getForecastConditions(
  segments: readonly Segment[],
  options: Options,
  provider: WeatherProvider,
  now: Date,
) {
  validateOptions(
    options,
    segments.map((s) => ({
      segmentId: s.id,
      geometry: s.geometry,
      source: s.provenance,
      slots: [],
    })),
  );
  const selected = segments.filter(
    (s) => !options.segmentIds || options.segmentIds.includes(s.id),
  );
  const sampled = sampleWeatherPoints(selected, now);
  const empty = analyzeCandidates([], options, now);
  if (!sampled.points.length)
    return {
      ...empty,
      errors: sampled.errors,
      weather: {
        status: "unavailable",
        snapshots: [],
        error: null,
      } satisfies ForecastResult,
    };
  let weather: ForecastResult;
  try {
    weather = await provider.getForecast({
      points: sampled.points,
      window: { startAt: options.startAt, endAt: options.endAt },
    });
  } catch {
    weather = {
      status: "unavailable",
      snapshots: [],
      error: { code: "FORECAST_UNAVAILABLE", retryAt: null },
    };
  }
  // Check disclosure before returning the weather envelope, including stale raw snapshots.
  try {
    for (const raw of weather.snapshots) {
      const snapshot = forecastSnapshot.parse(raw);
      requirePermission(snapshot.provenance, "analysis", now);
      requirePermission(snapshot.provenance, "derivedOutputs", now);
      if (
        Date.parse(snapshot.expiresAt) <= now.getTime() ||
        Date.parse(snapshot.retrievedAt) > now.getTime()
      )
        throw new Error("Invalid snapshot age");
      for (const hour of snapshot.hours) {
        requirePermission(hour.provenance, "analysis", now);
        requirePermission(hour.provenance, "derivedOutputs", now);
      }
    }
  } catch (e) {
    weather = {
      status: "unavailable",
      snapshots: [],
      error: {
        code:
          e instanceof SourceNotPermitted
            ? "SOURCE_NOT_PERMITTED"
            : "FORECAST_UNAVAILABLE",
        retryAt: null,
      },
    };
  }
  if (
    weather.status === "fresh" &&
    weather.snapshots.some((s) => Date.parse(s.freshUntil) <= now.getTime())
  )
    weather = {
      ...weather,
      status: "stale",
      error: { code: "FORECAST_UNAVAILABLE", retryAt: null },
    };
  // Stale forecasts are visible as dated data, never silently ranked as fresh.
  if (weather.status !== "fresh")
    return {
      ...empty,
      errors: [
        ...sampled.errors,
        ...sampled.routes.map((r) => ({
          segmentId: r.segment.id,
          attemptAt: null,
          code: weather.error?.code ?? "FORECAST_UNAVAILABLE",
          algorithmVersion,
        })),
      ],
      weather,
    };
  // Provider order is part of the interface; refuse a missing/mis-associated spatial response.
  if (
    weather.snapshots.length !== sampled.points.length ||
    weather.snapshots.some(
      (s, i) =>
        s.requestedCoordinate[0] !== sampled.points[i]![0] ||
        s.requestedCoordinate[1] !== sampled.points[i]![1],
    )
  )
    return {
      ...empty,
      errors: [
        ...sampled.errors,
        ...sampled.routes.map((r) => ({
          segmentId: r.segment.id,
          attemptAt: null,
          code: "FORECAST_UNAVAILABLE",
          algorithmVersion,
        })),
      ],
      weather: {
        status: "unavailable",
        snapshots: [],
        error: { code: "FORECAST_UNAVAILABLE", retryAt: null },
      } satisfies ForecastResult,
    };
  const candidates: Candidate[] = sampled.routes.map((r) => ({
    segmentId: r.segment.id,
    geometry: r.segment.geometry,
    source: r.segment.provenance,
    slots: hourlyInstants(options).map((attemptAt) => ({
      attemptAt,
      weather: {
        scope: "legs",
        hours: r.sampleIndices.map((index) =>
          weather.snapshots[index]!.hours.find((h) => h.validAt === attemptAt),
        ),
      },
    })),
  }));
  const result = analyzeCandidates(candidates, options, now);
  return { ...result, errors: [...sampled.errors, ...result.errors], weather };
}
