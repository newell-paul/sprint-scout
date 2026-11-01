import { describe, it } from "vitest";
import fc from "fast-check";
import { trackStretch, type LonLat } from "./track-stretch";

const runs = { numRuns: 200, seed: Number(process.env.FC_SEED ?? 20261101) };
const ride = fc
  .array(
    fc.tuple(
      fc.integer({ min: -2000, max: 2000 }),
      fc.integer({ min: -2000, max: 2000 }),
    ),
    { minLength: 2, maxLength: 1500 },
  )
  .map((steps) =>
    steps.map(([dx, dy]): LonLat => [-0.12 + dx * 1e-5, 51.5 + dy * 1e-5]),
  )
  .filter((points) =>
    points.some((p) => p[0] !== points[0]![0] || p[1] !== points[0]![1]),
  );
const limit = fc.integer({ min: 2, max: 600 });

describe("trackStretch invariants", () => {
  it("never exceeds the limit, keeps both ends, follows the ride's order and indexes each kept point", () => {
    fc.assert(
      fc.property(ride, limit, (track, maxPoints) => {
        const last = track.length - 1;
        let stretch;
        try {
          stretch = trackStretch(track, 0, last, maxPoints);
        } catch {
          // Only a ride that never moves is refused, and the filter excludes it.
          return false;
        }
        const { points } = stretch;
        const first = points[0]!;
        const end = points.at(-1)!;
        let cursor = 0;
        const ordered = points.every((p) => {
          while (
            cursor < track.length &&
            (track[cursor]![0] !== p[0] || track[cursor]![1] !== p[1])
          )
            cursor++;
          return cursor++ < track.length;
        });
        const indexed = stretch.indices.every(
          (index, i) =>
            (i === 0 || index > stretch.indices[i - 1]!) &&
            track[index]![0] === points[i]![0] &&
            track[index]![1] === points[i]![1],
        );
        return (
          indexed &&
          stretch.indices.length === points.length &&
          points.length <= maxPoints &&
          first[0] === track[0]![0] &&
          first[1] === track[0]![1] &&
          end[0] === track[last]![0] &&
          end[1] === track[last]![1] &&
          ordered
        );
      }),
      runs,
    );
  });
});
