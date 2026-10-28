// Cuts a segment out of a recorded ride. Pure and deterministic: the same
// track and picks always yield the same points, and every point returned is
// one of the track's own (the same array element), in riding order.
import { distance } from "@turf/distance";

export type Coordinate = [number, number];

const metres = (a: Coordinate, b: Coordinate) =>
  distance(a, b, { units: "meters" });

export function alongTrack(track: Coordinate[]) {
  const along: number[] = [];
  track.forEach((p, i) =>
    along.push(i === 0 ? 0 : along[i - 1]! + metres(track[i - 1]!, p)),
  );
  return along;
}

export function nearestOnTrack(
  track: Coordinate[],
  point: Coordinate,
  from = 0,
) {
  let index = -1;
  let distanceM = Number.POSITIVE_INFINITY;
  for (let i = Math.max(0, from); i < track.length; i++) {
    const d = metres(track[i]!, point);
    if (d < distanceM) {
      index = i;
      distanceM = d;
    }
  }
  return { index, distanceM };
}

// Douglas–Peucker on a local equirectangular projection, which is accurate to
// well under a metre across a segment's few kilometres. One pass at zero
// tolerance records each point's significance: its offset when split, capped by
// its parent's. Douglas–Peucker at tolerance t keeps exactly the points whose
// significance exceeds t, so doubling t needs no second pass. An explicit stack
// keeps a 250,000-point ride from overflowing the call stack.
function significance(points: Coordinate[]) {
  const ky = 111_320;
  const kx = ky * Math.cos((points[0]![1] * Math.PI) / 180);
  const xy = points.map((p) => [p[0] * kx, p[1] * ky] as const);
  const significant = new Float64Array(points.length);
  significant[0] = Number.POSITIVE_INFINITY;
  significant[points.length - 1] = Number.POSITIVE_INFINITY;
  const stack: [number, number, number][] = [
    [0, points.length - 1, Number.POSITIVE_INFINITY],
  ];
  while (stack.length) {
    const [first, last, cap] = stack.pop()!;
    const [ax, ay] = xy[first]!;
    const [bx, by] = xy[last]!;
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    let worst = -1;
    let worstM = 0;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = xy[i]!;
      const offM =
        length === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs(dy * (px - ax) - dx * (py - ay)) / length;
      if (offM > worstM) {
        worst = i;
        worstM = offM;
      }
    }
    if (worst !== -1) {
      const kept = Math.min(worstM, cap);
      significant[worst] = kept;
      stack.push([first, worst, kept], [worst, last, kept]);
    }
  }
  return significant;
}

export function thinTrack(points: Coordinate[], max: number) {
  if (max < 2) throw new Error("A thinned track needs at least 2 points.");
  const distinct = points.filter(
    (p, i) =>
      i === 0 || p[0] !== points[i - 1]![0] || p[1] !== points[i - 1]![1],
  );
  if (distinct.length <= 2) return distinct;
  const significant = significance(distinct);
  const count = (toleranceM: number) =>
    significant.reduce((n, s) => (s > toleranceM ? n + 1 : n), 0);
  let toleranceM = 1;
  while (count(toleranceM) > max) toleranceM *= 2;
  return distinct.filter((_, i) => significant[i]! > toleranceM);
}

export function segmentFromTrack(
  track: Coordinate[],
  start: number,
  finish: number,
  max = 500,
) {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(finish) ||
    start < 0 ||
    finish >= track.length ||
    start >= finish
  )
    throw new Error("A segment needs a start before the finish on the ride.");
  return thinTrack(track.slice(start, finish + 1), max);
}
