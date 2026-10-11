import { describe, it } from "vitest";
import fc from "fast-check";
import { projectWind, weatherIndex } from "./index";

const runs = { numRuns: 300, seed: Number(process.env.FC_SEED ?? 20260913) };
const speed = fc.double({
  min: 0,
  max: 60,
  noNaN: true,
  noDefaultInfinity: true,
});
const direction = fc.double({ min: 0, max: 359.999, noNaN: true });
const bearing = fc.double({ min: -720, max: 720, noNaN: true });
const near = (a: number, b: number, scale = 1) =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(scale));

describe("projectWind invariants", () => {
  it("conserves energy: tailwind² + crosswind² equals speed²", () => {
    fc.assert(
      fc.property(speed, direction, bearing, (s, from, forward) => {
        const { tailwindMps, crosswindMps } = projectWind(s, from, forward);
        return near(tailwindMps ** 2 + crosswindMps ** 2, s ** 2, s ** 2);
      }),
      runs,
    );
  });
  it("negates both components when the leg is reversed", () => {
    fc.assert(
      fc.property(speed, direction, bearing, (s, from, forward) => {
        const ahead = projectWind(s, from, forward);
        const back = projectWind(s, from, forward + 180);
        return (
          near(ahead.tailwindMps, -back.tailwindMps, s) &&
          near(ahead.crosswindMps, -back.crosswindMps, s)
        );
      }),
      runs,
    );
  });
  it("is invariant when wind and leg rotate together", () => {
    fc.assert(
      fc.property(
        speed,
        direction,
        bearing,
        direction,
        (s, from, forward, turn) => {
          const base = projectWind(s, from, forward);
          const turned = projectWind(s, (from + turn) % 360, forward + turn);
          return (
            near(base.tailwindMps, turned.tailwindMps, s) &&
            near(base.crosswindMps, turned.crosswindMps, s)
          );
        },
      ),
      runs,
    );
  });
  it("reports calm air as zero for any leg bearing", () => {
    fc.assert(
      fc.property(
        bearing,
        fc.option(direction, { nil: null }),
        (forward, from) => {
          const calm = projectWind(0, from, forward);
          return calm.tailwindMps === 0 && calm.crosswindMps === 0;
        },
      ),
      runs,
    );
  });
});

describe("weatherIndex invariants", () => {
  const tailwind = fc.double({ min: -50, max: 50, noNaN: true });
  it("stays within 0 to 100", () => {
    fc.assert(
      fc.property(tailwind, (t) => {
        const index = weatherIndex(t);
        return index >= 0 && index <= 100;
      }),
      runs,
    );
  });
  it("never decreases as tailwind increases", () => {
    fc.assert(
      fc.property(tailwind, tailwind, (a, b) => {
        const [low, high] = a <= b ? [a, b] : [b, a];
        return weatherIndex(low) <= weatherIndex(high);
      }),
      runs,
    );
  });
});
