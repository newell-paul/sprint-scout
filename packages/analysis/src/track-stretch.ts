// Cuts the stretch of a recorded ride between two picked points. Pure and
// deterministic: the same ride and picks always give the same segment.
import { distance } from "@turf/distance";

export type LonLat = [number, number];
export type Stretch = { points: LonLat[]; lengthM: number; thinned: boolean };

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
  const unique = track
    .slice(start, finish + 1)
    .filter(
      (p, i, all) =>
        i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1],
    );
  if (unique.length < 2)
    throw new Error("The ride doesn't move between those points.");
  const thinned = unique.length > maxPoints;
  const step = (unique.length - 1) / (maxPoints - 1);
  const points = thinned
    ? Array.from({ length: maxPoints }, (_, i) => unique[Math.round(i * step)]!)
    : unique;
  const lengthM = points
    .slice(1)
    .reduce((sum, p, i) => sum + metres(points[i]!, p), 0);
  return { points: points.map((p) => [p[0], p[1]]), lengthM, thinned };
}
