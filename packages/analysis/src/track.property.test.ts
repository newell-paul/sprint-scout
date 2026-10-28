import { describe, it } from "vitest";
import fc from "fast-check";
import { thinTrack, type Coordinate } from "./track";

const runs = { numRuns: 200, seed: Number(process.env.FC_SEED ?? 20261028) };
const track = fc.array(
  fc.tuple(
    fc.double({ min: -0.13, max: -0.11, noNaN: true }),
    fc.double({ min: 51.49, max: 51.51, noNaN: true }),
  ) as fc.Arbitrary<Coordinate>,
  { minLength: 2, maxLength: 400 },
);
const max = fc.integer({ min: 2, max: 60 });

describe("thinTrack invariants", () => {
  it("never exceeds the limit and keeps both ends", () => {
    fc.assert(
      fc.property(track, max, (points, limit) => {
        const thinned = thinTrack(points, limit);
        const distinct = points.filter(
          (p, i) =>
            i === 0 || p[0] !== points[i - 1]![0] || p[1] !== points[i - 1]![1],
        );
        if (distinct.length < 2) return thinned.length === distinct.length;
        return (
          thinned.length <= limit &&
          thinned[0] === distinct[0] &&
          thinned.at(-1) === distinct.at(-1)
        );
      }),
      runs,
    );
  });

  it("keeps only track points, in riding order", () => {
    fc.assert(
      fc.property(track, max, (points, limit) => {
        const indices = thinTrack(points, limit).map((p) => points.indexOf(p));
        return indices.every(
          (index, i) => index >= 0 && (i === 0 || index > indices[i - 1]!),
        );
      }),
      runs,
    );
  });
});
