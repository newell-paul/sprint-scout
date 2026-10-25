// Detects traversals of a drawn segment in a recorded GPS track. Pure and
// deterministic: the same track and segment always yield the same efforts.
import { prepareGeometry, type Coordinate, type Geometry } from "./index";

export const effortMatchVersion = "effort-match-v2" as const;
export type TrackPoint = { at: number; lon: number; lat: number };
export type MatchOptions = {
  /** Distance from the start or finish within which a crossing counts. */
  gateM?: number;
  /** Largest distance from the segment line allowed while on it. */
  corridorM?: number;
  /** Largest backward movement along the segment tolerated between samples. */
  backtrackM?: number;
};
export type EffortMatch = {
  version: typeof effortMatchVersion;
  startedAt: string;
  elapsedSeconds: number;
  firstIndex: number;
  lastIndex: number;
  maxDeviationM: number;
  sampleGapSeconds: number;
};
export const defaultMatchOptions: Required<MatchOptions> = {
  gateM: 25,
  corridorM: 40,
  backtrackM: 15,
};
export const trackLimits = { points: 250_000, gapSeconds: 60 } as const;

type Projection = {
  alongM: number;
  offM: number;
  x: number;
  y: number;
  /** On a loop, the nearest point is the shared start and finish itself. */
  seam: boolean;
};
// Along-route advance between two samples cannot exceed the distance actually
// moved, allowing π/2 for a bend inside one sample interval plus the corridor.
// A larger jump means the nearest leg changed across a gap in the route (the
// mouth of a U, a hairpin) rather than the route being ridden.
const skipsRoute = (a: Projection, b: Projection, corridorM: number) =>
  b.alongM - a.alongM >
  Math.hypot(b.x - a.x, b.y - a.y) * (Math.PI / 2) + corridorM;
type Frame = {
  lengthM: number;
  legs: {
    x0: number;
    y0: number;
    ux: number;
    uy: number;
    lengthM: number;
    startM: number;
  }[];
  origin: Coordinate;
  kx: number;
  ky: number;
};

function frame(geometry: Geometry): Frame {
  const origin = geometry.legs[0]!.start;
  const ky = 111_320;
  const kx = ky * Math.cos((origin[1] * Math.PI) / 180);
  const toXY = (p: Coordinate) =>
    [(p[0] - origin[0]) * kx, (p[1] - origin[1]) * ky] as const;
  let startM = 0;
  const legs = geometry.legs.map((leg) => {
    const [x0, y0] = toXY(leg.start);
    const [x1, y1] = toXY(leg.end);
    const lengthM = Math.hypot(x1 - x0, y1 - y0);
    const built = {
      x0,
      y0,
      ux: (x1 - x0) / lengthM,
      uy: (y1 - y0) / lengthM,
      lengthM,
      startM,
    };
    startM += lengthM;
    return built;
  });
  return { lengthM: startM, legs, origin, kx, ky };
}

// On a loop neither end is extended: either side of the shared start and finish
// is the next or previous lap, so a sample beyond it projects onto that point.
function project(
  f: Frame,
  lon: number,
  lat: number,
  loop: boolean,
): Projection {
  const x = (lon - f.origin[0]) * f.kx;
  const y = (lat - f.origin[1]) * f.ky;
  let best: Projection = {
    alongM: Number.NaN,
    offM: Number.POSITIVE_INFINITY,
    x,
    y,
    seam: false,
  };
  f.legs.forEach((leg, index) => {
    const dx = x - leg.x0;
    const dy = y - leg.y0;
    const raw = dx * leg.ux + dy * leg.uy;
    const first = index === 0 && !loop;
    const last = index === f.legs.length - 1 && !loop;
    const t = Math.max(
      first ? Number.NEGATIVE_INFINITY : 0,
      Math.min(last ? Number.POSITIVE_INFINITY : leg.lengthM, raw),
    );
    const offM = Math.hypot(dx - t * leg.ux, dy - t * leg.uy);
    if (offM < best.offM)
      best = { alongM: leg.startM + t, offM, x, y, seam: false };
  });
  best.seam = loop && (best.alongM <= 1e-6 || best.alongM >= f.lengthM - 1e-6);
  return best;
}

function validateTrack(track: readonly TrackPoint[]) {
  if (track.length > trackLimits.points)
    throw new Error(`Track has more than ${trackLimits.points} points.`);
  let previous = Number.NEGATIVE_INFINITY;
  for (const p of track) {
    if (
      !Number.isFinite(p.at) ||
      !Number.isFinite(p.lon) ||
      !Number.isFinite(p.lat) ||
      Math.abs(p.lon) > 180 ||
      Math.abs(p.lat) > 90
    )
      throw new Error("Track points need finite time, longitude and latitude.");
    if (p.at <= previous)
      throw new Error("Track times must strictly increase.");
    previous = p.at;
  }
}

const crossing = (
  a: TrackPoint,
  b: TrackPoint,
  sa: number,
  sb: number,
  line: number,
) => a.at + ((b.at - a.at) * (line - sa)) / (sb - sa);

export function matchEfforts(
  segment: readonly Coordinate[] | unknown,
  track: readonly TrackPoint[],
  options: MatchOptions = {},
): EffortMatch[] {
  const { gateM, corridorM, backtrackM } = {
    ...defaultMatchOptions,
    ...options,
  };
  if (
    ![gateM, corridorM, backtrackM].every((n) => Number.isFinite(n) && n >= 0)
  )
    throw new Error("Match options must be finite and non-negative.");
  validateTrack(track);
  const geometry = prepareGeometry({
    type: "LineString",
    coordinates: segment,
  });
  const f = frame(geometry);
  const end = f.legs.at(-1)!;
  const start = [0, 0] as const;
  const finish = [
    end.x0 + end.ux * end.lengthM,
    end.y0 + end.uy * end.lengthM,
  ] as const;
  const loop = Math.hypot(...finish) <= gateM;
  // On a loop, a change of more than half a lap between samples crosses the
  // shared start and finish rather than riding backwards or skipping a lap.
  // A sample beyond that point sits its distance from it before the start or
  // past the finish.
  const wraps = (from: number, to: number) => loop && from - to > f.lengthM / 2;
  const before = (p: Projection, next: Projection): Projection =>
    p.seam
      ? { ...p, alongM: -p.offM }
      : wraps(p.alongM, next.alongM)
        ? { ...p, alongM: p.alongM - f.lengthM }
        : p;
  const after = (p: Projection, prev: Projection): Projection =>
    p.seam
      ? {
          ...p,
          alongM: prev.alongM > f.lengthM / 2 ? f.lengthM + p.offM : -p.offM,
        }
      : wraps(prev.alongM, p.alongM)
        ? { ...p, alongM: p.alongM + f.lengthM }
        : wraps(p.alongM, prev.alongM)
          ? { ...p, alongM: p.alongM - f.lengthM }
          : p;
  // A loop's start and finish are points, so its gates ask whether the ride
  // between two samples passed within gateM of one, and time the crossing at
  // the closest approach.
  const closest = (
    a: Projection,
    b: Projection,
    [px, py]: readonly [number, number],
  ) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)),
    );
    return { t, distanceM: Math.hypot(a.x + t * dx - px, a.y + t * dy - py) };
  };
  const between = (k: number, t: number) =>
    track[k]!.at + (track[k + 1]!.at - track[k]!.at) * t;
  const projected = track.map((p) => project(f, p.lon, p.lat, loop));
  const efforts: EffortMatch[] = [];
  let i = 0;
  while (i < track.length - 1) {
    const next = projected[i + 1]!;
    const here = before(projected[i]!, next);
    const entersAtStart =
      here.alongM <= 0 &&
      next.alongM > 0 &&
      (loop
        ? closest(here, next, start).distanceM <= gateM
        : here.offM <= gateM) &&
      next.offM <= corridorM &&
      !skipsRoute(here, next, corridorM) &&
      track[i + 1]!.at - track[i]!.at <= trackLimits.gapSeconds * 1000;
    if (!entersAtStart) {
      i++;
      continue;
    }
    let j = i + 1;
    let maxDeviationM = next.offM;
    let gapSeconds = (track[i + 1]!.at - track[i]!.at) / 1000;
    let finishedAt: number | null = null;
    let prev = here;
    while (j < track.length) {
      const p = after(projected[j]!, prev);
      // Beyond a loop's shared point, offM runs along the track.
      if (
        (!p.seam && p.offM > corridorM) ||
        p.alongM < prev.alongM - backtrackM ||
        skipsRoute(prev, p, corridorM) ||
        track[j]!.at - track[j - 1]!.at > trackLimits.gapSeconds * 1000
      )
        break;
      if (!p.seam)
        maxDeviationM = Math.max(maxDeviationM, Math.min(p.offM, corridorM));
      if (j > i + 1)
        gapSeconds = Math.max(
          gapSeconds,
          (track[j]!.at - track[j - 1]!.at) / 1000,
        );
      if (p.alongM >= f.lengthM) {
        if (loop) {
          const gate = closest(prev, p, finish);
          if (gate.distanceM <= gateM) finishedAt = between(j - 1, gate.t);
        } else if (prev.offM <= gateM || p.offM <= gateM)
          finishedAt = crossing(
            track[j - 1]!,
            track[j]!,
            prev.alongM,
            p.alongM,
            f.lengthM,
          );
        break;
      }
      prev = p;
      j++;
    }
    if (finishedAt !== null) {
      const startedAt = loop
        ? between(i, closest(here, next, start).t)
        : crossing(track[i]!, track[i + 1]!, here.alongM, next.alongM, 0);
      efforts.push({
        version: effortMatchVersion,
        startedAt: new Date(Math.round(startedAt)).toISOString(),
        elapsedSeconds: Math.max(
          0.1,
          Math.round(((finishedAt - startedAt) / 1000) * 10) / 10,
        ),
        firstIndex: i,
        lastIndex: j,
        maxDeviationM: Math.round(maxDeviationM * 10) / 10,
        sampleGapSeconds: Math.round(gapSeconds * 10) / 10,
      });
      // The next lap of a loop starts at the crossing that finished this one.
      i = loop ? Math.max(i + 1, j - 1) : j;
    } else {
      i++;
    }
  }
  return efforts;
}
