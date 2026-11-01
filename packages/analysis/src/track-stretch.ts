// Cuts the stretch of a recorded ride between two picked points. Pure and
// deterministic: the same ride and picks always give the same segment.
import { distance } from "@turf/distance";

export type LonLat = [number, number];
export type Stretch = {
  points: LonLat[];
  /** Index in the ride of each kept point, so callers can read its other fields. */
  indices: number[];
  lengthM: number;
  thinned: boolean;
};

const metres = (a: LonLat, b: LonLat) => distance(a, b, { units: "meters" });

export function nearestTrackIndex(
  track: readonly LonLat[],
  at: LonLat,
  toleranceM: number,
  after = -1,
): number | null {
  let best: number | null = null;
  let bestM = toleranceM;
  for (let i = after + 1; i < track.length; i++) {
    const m = metres(track[i]!, at);
    if (m < bestM || (best === null && m === bestM)) {
      best = i;
      bestM = m;
    }
  }
  return best;
}

export function trackStretch(
  track: readonly LonLat[],
  start: number,
  finish: number,
  maxPoints = 500,
): Stretch {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(finish) ||
    start < 0 ||
    finish >= track.length ||
    finish <= start ||
    !Number.isInteger(maxPoints) ||
    maxPoints < 2
  )
    throw new Error("Pick a start before the finish on the ride.");
  // A run of repeated positions keeps its first index.
  const unique: number[] = [];
  for (let i = start; i <= finish; i++) {
    const p = track[i]!;
    const previous = track[i - 1];
    if (i === start || p[0] !== previous![0] || p[1] !== previous![1])
      unique.push(i);
  }
  if (unique.length < 2)
    throw new Error("The ride doesn't move between those points.");
  const thinned = unique.length > maxPoints;
  const step = (unique.length - 1) / (maxPoints - 1);
  const indices = thinned
    ? Array.from({ length: maxPoints }, (_, i) => unique[Math.round(i * step)]!)
    : unique;
  const points = indices.map((i): LonLat => [track[i]![0], track[i]![1]]);
  const lengthM = points
    .slice(1)
    .reduce((sum, p, i) => sum + metres(points[i]!, p), 0);
  return { points, indices, lengthM, thinned };
}
