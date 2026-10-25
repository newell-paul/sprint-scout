import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { destination } from "@turf/destination";
import { bearing } from "@turf/bearing";
import { distance } from "@turf/distance";
import {
  defaultMatchOptions,
  matchEfforts,
  trackLimits,
  type TrackPoint,
} from "./effort-match";
import type { Coordinate } from "./index";

const runs = { numRuns: 120, seed: Number(process.env.FC_SEED ?? 20260913) };
const hill: Coordinate[] = [
  [-0.12, 51.5],
  [-0.12, 51.505],
  [-0.115, 51.508],
];
const bend: Coordinate[] = [
  [-1.5, 52],
  [-1.49, 52],
  [-1.49, 52.004],
];
const lengthOf = (points: Coordinate[]) =>
  points
    .slice(1)
    .reduce(
      (sum, p, i) => sum + distance(points[i]!, p, { units: "meters" }),
      0,
    );

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Position at signed distance d along the polyline, extrapolating both ends. */
function along(
  points: Coordinate[],
  d: number,
): { point: Coordinate; heading: number } {
  let offset = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const legM = distance(a, b, { units: "meters" });
    const heading = bearing(a, b);
    const last = i === points.length - 1;
    if (d <= offset + legM || last) {
      const p = destination(a, d - offset, heading, { units: "meters" })
        .geometry.coordinates;
      return { point: [p[0]!, p[1]!], heading };
    }
    offset += legM;
  }
  throw new Error("unreachable");
}

type Ride = {
  speedMps?: number;
  intervalS?: number;
  noiseM?: number;
  leadM?: number;
  startAt?: number;
  reverse?: boolean;
  seed?: number;
  /** Lateral drift reached at the finish, growing linearly from the start. */
  driftM?: number;
};
function ride(points: Coordinate[], options: Ride = {}): TrackPoint[] {
  const {
    speedMps = 12,
    intervalS = 1,
    noiseM = 0,
    leadM = 300,
    startAt = Date.parse("2026-09-12T09:00:00Z"),
    reverse = false,
    seed = 1,
    driftM = 0,
  } = options;
  const route = reverse ? [...points].reverse() : points;
  const total = lengthOf(route);
  const random = lcg(seed);
  const track: TrackPoint[] = [];
  for (
    let d = -leadM, k = 0;
    d <= total + leadM;
    d += speedMps * intervalS, k++
  ) {
    const { point, heading } = along(route, d);
    const lateral =
      (noiseM === 0 ? 0 : (random() * 2 - 1) * noiseM) +
      (driftM === 0 ? 0 : (Math.max(0, Math.min(total, d)) / total) * driftM);
    const noisy =
      lateral === 0
        ? point
        : (destination(point, lateral, heading + 90, { units: "meters" })
            .geometry.coordinates as [number, number]);
    track.push({
      at: startAt + k * intervalS * 1000,
      lon: noisy[0],
      lat: noisy[1],
    });
  }
  return track;
}

describe("effort matching", () => {
  it("finds one effort with the elapsed time of the traversal", () => {
    const efforts = matchEfforts(hill, ride(hill, { speedMps: 10 }));
    expect(efforts).toHaveLength(1);
    const effort = efforts[0]!;
    expect(effort.elapsedSeconds).toBeCloseTo(lengthOf(hill) / 10, 0);
    expect(effort.startedAt).toBe("2026-09-12T09:00:30.000Z");
    expect(effort.maxDeviationM).toBeLessThan(2);
    expect(effort.sampleGapSeconds).toBe(1);
    expect(effort.version).toBe("effort-match-v1");
  });
  it("finds every lap of a repeated segment in order", () => {
    const lap1 = ride(hill, { speedMps: 10 });
    const lap2 = ride(hill, { speedMps: 8, startAt: lap1.at(-1)!.at + 60_000 });
    const efforts = matchEfforts(hill, [...lap1, ...lap2]);
    expect(efforts.map((e) => Math.round(e.elapsedSeconds))).toEqual([
      Math.round(lengthOf(hill) / 10),
      Math.round(lengthOf(hill) / 8),
    ]);
    expect(efforts[0]!.lastIndex).toBeLessThan(efforts[1]!.firstIndex);
  });
  it("ignores a track that rides the segment the wrong way", () => {
    expect(matchEfforts(hill, ride(hill, { reverse: true }))).toEqual([]);
  });
  it("ignores a track that never passes the start gate", () => {
    const shifted: Coordinate[] = hill.map(([lon, lat]) => [lon + 0.001, lat]);
    expect(matchEfforts(hill, ride(shifted))).toEqual([]);
  });
  it("drops an effort that leaves the corridor before the finish", () => {
    const detour: Coordinate[] = [
      hill[0]!,
      hill[1]!,
      [-0.113, 51.506],
      hill[2]!,
    ];
    expect(matchEfforts(hill, ride(detour))).toEqual([]);
  });
  it("does not finish an effort that reaches the finish line outside the gate", () => {
    const drifted = ride(hill, { driftM: 32 });
    expect(matchEfforts(hill, drifted)).toEqual([]);
    expect(matchEfforts(hill, drifted, { gateM: 35 })).toHaveLength(1);
  });
  it("tolerates GPS noise inside the gate", () => {
    const efforts = matchEfforts(hill, ride(hill, { noiseM: 10, seed: 7 }));
    expect(efforts).toHaveLength(1);
    expect(efforts[0]!.maxDeviationM).toBeLessThanOrEqual(10);
  });
  it("reports the largest sampling gap so sparse recordings are visible", () => {
    const efforts = matchEfforts(hill, ride(hill, { intervalS: 5 }));
    expect(efforts).toHaveLength(1);
    expect(efforts[0]!.sampleGapSeconds).toBe(5);
    expect(
      Math.abs(efforts[0]!.elapsedSeconds - lengthOf(hill) / 12),
    ).toBeLessThan(5);
  });
  it("never times an effort across a pause longer than the gap limit", () => {
    const paused = ride(hill, { speedMps: 1, intervalS: 61 });
    const steady = ride(hill, { speedMps: 1, intervalS: 59 });
    expect(matchEfforts(hill, paused)).toEqual([]);
    expect(matchEfforts(hill, steady)).toHaveLength(1);
  });
  it("does not start an effort on a pause that straddles the start line", () => {
    // 300 m lead at 10 m/s and 1 s: sample 30 sits on the start line.
    const paused = ride(hill, { speedMps: 10 }).map((p, k) =>
      k > 30 ? { ...p, at: p.at + 3_600_000 } : p,
    );
    expect(matchEfforts(hill, paused)).toEqual([]);
  });
  it("does not invent an effort from crossing the mouth of a U", () => {
    const a: Coordinate = [-0.12, 51.5];
    const at = (from: Coordinate, m: number, deg: number): Coordinate => {
      const p = destination(from, m, deg, { units: "meters" }).geometry
        .coordinates;
      return [p[0]!, p[1]!];
    };
    const b = at(a, 500, 0);
    const c = at(b, 50, 90);
    const d = at(c, 500, 180);
    const u = [a, b, c, d];
    const t0 = Date.UTC(2026, 8, 13, 8, 0, 0);
    const crossing: TrackPoint[] = Array.from({ length: 12 }, (_, i) => {
      const [lon, lat] = at(a, -30 + i * 10, 90);
      return { at: t0 + i * 1000, lon, lat };
    });
    expect(matchEfforts(u, crossing)).toEqual([]);
    const ride = (stepM: number): TrackPoint[] => {
      const total = lengthOf(u);
      const points: TrackPoint[] = [];
      for (let m = -30, i = 0; m <= total + 30; m += stepM, i++) {
        const [lon, lat] = along(u, m).point;
        points.push({ at: t0 + i * 1000 * (stepM / 10), lon, lat });
      }
      return points;
    };
    expect(matchEfforts(u, ride(10))).toHaveLength(1);
    expect(matchEfforts(u, ride(40))).toHaveLength(1);
  });
  it("rejects invalid tracks, options and geometry", () => {
    const track = ride(hill);
    expect(() => matchEfforts(hill, [track[1]!, track[0]!])).toThrow(
      "strictly increase",
    );
    expect(() => matchEfforts(hill, [{ at: 1, lon: 181, lat: 0 }])).toThrow(
      "finite",
    );
    expect(() =>
      matchEfforts(hill, [{ at: Number.NaN, lon: 0, lat: 0 }]),
    ).toThrow("finite");
    expect(() => matchEfforts(hill, track, { gateM: -1 })).toThrow(
      "non-negative",
    );
    expect(() => matchEfforts([[0, 0]], track)).toThrow();
    const huge = Array.from({ length: trackLimits.points + 1 }, (_, i) => ({
      at: i,
      lon: 0,
      lat: 0,
    }));
    expect(() => matchEfforts(hill, huge)).toThrow("more than");
    expect(defaultMatchOptions).toEqual({
      gateM: 25,
      corridorM: 40,
      backtrackM: 15,
    });
  });
});

describe("effort matching invariants", () => {
  const speed = fc.double({ min: 4, max: 20, noNaN: true });
  const interval = fc.constantFrom(1, 2, 3, 5);
  const noise = fc.double({ min: 0, max: 8, noNaN: true });
  const seed = fc.integer({ min: 1, max: 1_000_000 });
  const segment = fc.constantFrom(hill, bend);
  it("times a clean traversal to within one sample interval", () => {
    fc.assert(
      fc.property(
        segment,
        speed,
        interval,
        seed,
        (points, speedMps, intervalS, s) => {
          const efforts = matchEfforts(
            points,
            ride(points, { speedMps, intervalS, seed: s }),
          );
          return (
            efforts.length === 1 &&
            Math.abs(
              efforts[0]!.elapsedSeconds - lengthOf(points) / speedMps,
            ) <= intervalS
          );
        },
      ),
      runs,
    );
  });
  it("is invariant to shifting every timestamp", () => {
    fc.assert(
      fc.property(
        segment,
        speed,
        fc.integer({ min: -1e9, max: 1e9 }),
        (points, speedMps, shiftMs) => {
          const track = ride(points, { speedMps });
          const base = matchEfforts(points, track)[0]!;
          const moved = matchEfforts(
            points,
            track.map((p) => ({ ...p, at: p.at + shiftMs })),
          )[0]!;
          return (
            moved.elapsedSeconds === base.elapsedSeconds &&
            Date.parse(moved.startedAt) - Date.parse(base.startedAt) === shiftMs
          );
        },
      ),
      runs,
    );
  });
  it("still matches with bounded noise and never a reversed ride", () => {
    fc.assert(
      fc.property(
        segment,
        speed,
        noise,
        seed,
        (points, speedMps, noiseM, s) => {
          const forward = matchEfforts(
            points,
            ride(points, { speedMps, noiseM, seed: s }),
          );
          const backward = matchEfforts(
            points,
            ride(points, { speedMps, noiseM, seed: s, reverse: true }),
          );
          return (
            forward.length === 1 &&
            forward[0]!.maxDeviationM <= noiseM + 0.5 &&
            backward.length === 0
          );
        },
      ),
      runs,
    );
  });
  it("is deterministic", () => {
    fc.assert(
      fc.property(
        segment,
        speed,
        noise,
        seed,
        (points, speedMps, noiseM, s) => {
          const track = ride(points, { speedMps, noiseM, seed: s });
          return (
            JSON.stringify(matchEfforts(points, track)) ===
            JSON.stringify(matchEfforts(points, track))
          );
        },
      ),
      runs,
    );
  });
});
