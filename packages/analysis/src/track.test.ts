import { describe, expect, it } from "vitest";
import {
  alongTrack,
  nearestOnTrack,
  segmentFromTrack,
  thinTrack,
  type Coordinate,
} from "./track";

// 0.001° of latitude is about 111 m everywhere.
const north = (n: number, step = 0.001): Coordinate[] =>
  Array.from({ length: n }, (_, i) => [-0.12, 51.5 + i * step]);

describe("alongTrack", () => {
  it("accumulates great-circle metres from the first point", () => {
    const along = alongTrack(north(3));
    expect(along[0]).toBe(0);
    expect(along[1]).toBeCloseTo(111.2, 0);
    expect(along[2]).toBeCloseTo(222.4, 0);
  });

  it("is empty for an empty track", () => {
    expect(alongTrack([])).toEqual([]);
  });
});

describe("nearestOnTrack", () => {
  it("finds the closest point and its distance", () => {
    const hit = nearestOnTrack(north(5), [-0.12, 51.5021]);
    expect(hit.index).toBe(2);
    expect(hit.distanceM).toBeCloseTo(11.1, 0);
  });

  it("searches only from the given index, so a second lap is found after the first", () => {
    const laps = [...north(5), ...north(5)];
    expect(nearestOnTrack(laps, [-0.12, 51.503]).index).toBe(3);
    expect(nearestOnTrack(laps, [-0.12, 51.503], 4).index).toBe(8);
  });

  it("keeps the earliest index on a tie", () => {
    const track: Coordinate[] = [
      [-0.12, 51.5],
      [-0.12, 51.502],
    ];
    expect(nearestOnTrack(track, [-0.12, 51.501]).index).toBe(0);
  });

  it("returns no hit when nothing is left to search", () => {
    expect(nearestOnTrack(north(3), [-0.12, 51.5], 3)).toEqual({
      index: -1,
      distanceM: Number.POSITIVE_INFINITY,
    });
  });
});

describe("thinTrack", () => {
  it("reduces a straight line to its two ends", () => {
    expect(thinTrack(north(50), 500)).toEqual([
      [-0.12, 51.5],
      [-0.12, 51.5 + 49 * 0.001],
    ]);
  });

  it("keeps a corner that leaves the line by more than a metre", () => {
    const corner: Coordinate[] = [
      [-0.12, 51.5],
      [-0.12, 51.501],
      [-0.119, 51.501],
    ];
    expect(thinTrack(corner, 500)).toEqual(corner);
  });

  it("keeps the far side of a loop that ends where it started", () => {
    const loop: Coordinate[] = [
      [-0.12, 51.5],
      [-0.12, 51.501],
      [-0.119, 51.501],
      [-0.12, 51.5],
    ];
    expect(thinTrack(loop, 500)).toEqual(loop);
  });

  it("drops consecutive duplicates before thinning", () => {
    expect(
      thinTrack(
        [
          [-0.12, 51.5],
          [-0.12, 51.5],
          [-0.119, 51.5],
        ],
        500,
      ),
    ).toEqual([
      [-0.12, 51.5],
      [-0.119, 51.5],
    ]);
  });

  it("raises the tolerance until the points fit", () => {
    const zigzag: Coordinate[] = Array.from({ length: 2000 }, (_, i) => [
      -0.12 + (i % 2) * 0.0001 * (1 + (i % 7)),
      51.5 + i * 0.0001,
    ]);
    const thinned = thinTrack(zigzag, 500);
    expect(thinned.length).toBeLessThanOrEqual(500);
    expect(thinned[0]).toEqual(zigzag[0]);
    expect(thinned.at(-1)).toEqual(zigzag.at(-1));
  });

  it("leaves short tracks alone", () => {
    expect(thinTrack([[-0.12, 51.5]], 500)).toEqual([[-0.12, 51.5]]);
    expect(thinTrack([], 500)).toEqual([]);
  });

  it("thins a 250,000-point ride to 500 or fewer", () => {
    const ride: Coordinate[] = Array.from({ length: 250_000 }, (_, i) => [
      -0.12 + Math.sin(i / 400) * 0.01,
      51.5 + i * 0.000005,
    ]);
    const thinned = thinTrack(ride, 500);
    expect(thinned.length).toBeGreaterThan(2);
    expect(thinned.length).toBeLessThanOrEqual(500);
  });

  it("rejects a limit below two points", () => {
    expect(() => thinTrack(north(3), 1)).toThrow("at least 2");
  });
});

describe("segmentFromTrack", () => {
  it("cuts from start to finish inclusive and thins the cut", () => {
    expect(segmentFromTrack(north(10), 2, 6)).toEqual([
      [-0.12, 51.5 + 2 * 0.001],
      [-0.12, 51.5 + 6 * 0.001],
    ]);
  });

  it("cuts a single leg", () => {
    expect(segmentFromTrack(north(3), 1, 2)).toHaveLength(2);
  });

  it.each([
    [3, 3],
    [4, 2],
    [-1, 2],
    [0, 10],
    [0.5, 2],
  ])("rejects start %s and finish %s", (start, finish) => {
    expect(() => segmentFromTrack(north(10), start, finish)).toThrow(
      "start before the finish",
    );
  });
});
