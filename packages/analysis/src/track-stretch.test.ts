import { describe, expect, it } from "vitest";
import { nearestTrackIndex, trackStretch, type LonLat } from "./track-stretch";

// About 11 m per step northwards, like a ride recorded at 1 Hz and 40 km/h.
const north = (n: number, from = 51.5): LonLat[] =>
  Array.from({ length: n }, (_, i) => [-0.12, from + i * 0.0001]);

describe("nearestTrackIndex", () => {
  const ride = north(10);

  it("finds the nearest point within the tolerance", () => {
    expect(nearestTrackIndex(ride, [-0.12001, 51.50031], 25)).toBe(3);
  });
  it("returns null when every point is beyond the tolerance", () => {
    expect(nearestTrackIndex(ride, [-0.13, 51.5], 25)).toBeNull();
  });
  it("counts a point exactly at the tolerance", () => {
    const toleranceM = 11.119;
    const at: LonLat = [-0.12, 51.5 - 0.0001];
    expect(nearestTrackIndex(ride, at, toleranceM + 0.01)).toBe(0);
    expect(nearestTrackIndex(ride, at, toleranceM - 0.01)).toBeNull();
  });
  it("only searches after the given index", () => {
    expect(nearestTrackIndex(ride, [-0.12, 51.5002], 25, 2)).toBe(3);
    expect(nearestTrackIndex(ride, [-0.12, 51.5], 5, 2)).toBeNull();
  });
  it("prefers the earliest of equally near points", () => {
    const laps = [...north(5), ...north(5)];
    expect(nearestTrackIndex(laps, [-0.12, 51.5002], 25)).toBe(2);
    expect(nearestTrackIndex(laps, [-0.12, 51.5002], 25, 2)).toBe(7);
  });
  it("keeps the first point at a zero tolerance when it is exact", () => {
    expect(nearestTrackIndex(ride, [-0.12, 51.5004], 0)).toBe(4);
  });
  it("finds nothing on an empty ride", () => {
    expect(nearestTrackIndex([], [-0.12, 51.5], 25)).toBeNull();
  });
});

describe("trackStretch", () => {
  it("takes every point from start to finish inclusive", () => {
    const ride = north(10);
    const stretch = trackStretch(ride, 2, 5);
    expect(stretch.points).toEqual(ride.slice(2, 6));
    expect(stretch.indices).toEqual([2, 3, 4, 5]);
    expect(stretch.thinned).toBe(false);
    expect(stretch.lengthM).toBeCloseTo(33.36, 1);
  });
  it("returns copies, never the ride's own arrays", () => {
    const ride = north(3);
    expect(trackStretch(ride, 0, 2).points[0]).not.toBe(ride[0]);
  });
  it("drops consecutive repeats from a stop, indexing the first of each run", () => {
    const [a, b, c] = north(3) as [LonLat, LonLat, LonLat];
    const stretch = trackStretch([a, a, b, b, b, c, a], 0, 6);
    expect(stretch.points).toEqual([a, b, c, a]);
    expect(stretch.indices).toEqual([0, 2, 5, 6]);
  });
  it("refuses a stretch that never moves", () => {
    const [a] = north(1) as [LonLat];
    expect(() => trackStretch([a, a, a], 0, 2)).toThrow(
      "The ride doesn't move between those points.",
    );
  });
  it("thins a long stretch evenly and keeps both ends", () => {
    const ride = north(1000);
    const stretch = trackStretch(ride, 0, 999);
    expect(stretch.thinned).toBe(true);
    expect(stretch.points).toHaveLength(500);
    expect(stretch.points[0]).toEqual(ride[0]);
    expect(stretch.points[1]).toEqual(ride[2]);
    expect(stretch.points[499]).toEqual(ride[999]);
    expect(stretch.indices.slice(0, 2)).toEqual([0, 2]);
    expect(stretch.indices.at(-1)).toBe(999);
  });
  it("keeps a stretch of exactly the limit untouched", () => {
    const ride = north(500);
    const stretch = trackStretch(ride, 0, 499);
    expect(stretch.thinned).toBe(false);
    expect(stretch.points).toEqual(ride);
  });
  it("thins to a smaller limit", () => {
    const ride = north(5);
    expect(trackStretch(ride, 0, 4, 3).points).toEqual([
      ride[0],
      ride[2],
      ride[4],
    ]);
  });
  it.each([
    ["a finish before the start", 5, 2, 500],
    ["a finish equal to the start", 3, 3, 500],
    ["a negative start", -1, 3, 500],
    ["a finish past the end", 0, 10, 500],
    ["a fractional index", 0.5, 3, 500],
    ["a fractional finish", 0, 3.5, 500],
    ["a limit below two points", 0, 3, 1],
    ["a fractional limit", 0, 3, 2.5],
  ])("refuses %s", (_, start, finish, maxPoints) => {
    expect(() => trackStretch(north(10), start, finish, maxPoints)).toThrow(
      "Pick a start before the finish on the ride.",
    );
  });
});
