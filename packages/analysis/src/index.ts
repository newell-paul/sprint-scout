import { distance } from "@turf/distance";
import { bearing } from "@turf/bearing";
import { destination } from "@turf/destination";
export * from "./ride-effect";
export * from "./terrain-effect";
import { coordinate, lineString } from "@scout/contracts";

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
  const parsed = lineString.safeParse(input);
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
