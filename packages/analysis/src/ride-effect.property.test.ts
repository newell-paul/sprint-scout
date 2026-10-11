import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  alongRouteSigmaMps,
  estimateRideEffect,
  referenceRider,
  riderFromPower,
  riderLimits,
  solveSpeedMps,
  windUncertainty,
  type RideLeg,
} from "./ride-effect";
import { estimateTerrainEffect, solveTerrainSpeedMps } from "./terrain-effect";

const runs = { numRuns: 200, seed: Number(process.env.FC_SEED ?? 20260913) };
const wind = fc.double({ min: -40, max: 40, noNaN: true });
const lead = fc.double({ min: 0, max: 300, noNaN: true });
const leg = fc.record({
  distanceM: fc.double({ min: 10, max: 5000, noNaN: true }),
  tailwindMps: fc.double({ min: -20, max: 20, noNaN: true }),
  crosswindMps: fc.double({ min: -20, max: 20, noNaN: true }),
});
const legs = fc.array(leg, { minLength: 1, maxLength: 5 });
const ordered = (a: number, b: number): [number, number] =>
  a <= b ? [a, b] : [b, a];

describe("flat-road ride effect invariants", () => {
  it("never slows down when the along-route wind increases", () => {
    fc.assert(
      fc.property(wind, wind, (a, b) => {
        const [less, more] = ordered(a, b);
        return solveSpeedMps(less) <= solveSpeedMps(more) + 1e-9;
      }),
      runs,
    );
  });
  it("never adds time when every leg gains tailwind", () => {
    fc.assert(
      fc.property(
        legs,
        fc.double({ min: 0, max: 10, noNaN: true }),
        (route, gain) => {
          const base = estimateRideEffect(route);
          const helped = estimateRideEffect(
            route.map((l) => ({ ...l, tailwindMps: l.tailwindMps + gain })),
          );
          return helped.timeDeltaS <= base.timeDeltaS + 1e-6;
        },
      ),
      runs,
    );
  });
  it("keeps the point estimate inside the uncertainty band", () => {
    fc.assert(
      fc.property(legs, lead, (route, leadHours) => {
        const { band, speedDeltaMps } = estimateRideEffect(route, undefined, {
          leadHours,
        });
        return (
          band !== null &&
          band.speedDeltaLowMps <= speedDeltaMps + 1e-9 &&
          speedDeltaMps <= band.speedDeltaHighMps + 1e-9
        );
      }),
      runs,
    );
  });
  it("grows forecast uncertainty with lead time and clamps it at ten days", () => {
    fc.assert(
      fc.property(lead, lead, (a, b) => {
        const [sooner, later] = ordered(a, b);
        const s = windUncertainty(sooner);
        const l = windUncertainty(later);
        return (
          s.windSigmaMps <= l.windSigmaMps &&
          s.directionSigmaDegrees <= l.directionSigmaDegrees
        );
      }),
      runs,
    );
    expect(windUncertainty(300)).toEqual(windUncertainty(240));
    expect(windUncertainty(-5)).toEqual(windUncertainty(0));
  });
  it("reports at least the speed sigma for any along-route error", () => {
    fc.assert(
      fc.property(wind, wind, lead, (tail, cross, leadHours) => {
        const sigma = alongRouteSigmaMps(tail, cross, leadHours);
        return Number.isFinite(sigma) && sigma >= 0;
      }),
      runs,
    );
    expect(alongRouteSigmaMps(0, 0, 12)).toBe(windUncertainty(12).windSigmaMps);
  });
  it("derives a faster calm speed from more power, and a slower one from more drag", () => {
    const power = fc.integer({
      min: riderLimits.powerW.min,
      max: riderLimits.powerW.max,
    });
    const cda = fc.double({
      min: riderLimits.cdaM2.min,
      max: riderLimits.cdaM2.max,
      noNaN: true,
    });
    fc.assert(
      fc.property(power, power, cda, (a, b, cdaM2) => {
        const [less, more] = ordered(a, b);
        const massKg = 80;
        return (
          riderFromPower({ powerW: less, massKg, cdaM2 }).calmSpeedKmh <=
          riderFromPower({ powerW: more, massKg, cdaM2 }).calmSpeedKmh + 1e-9
        );
      }),
      runs,
    );
    fc.assert(
      fc.property(power, cda, cda, (powerW, a, b) => {
        const [sleek, bulky] = ordered(a, b);
        return (
          riderFromPower({ powerW, massKg: 80, cdaM2: bulky }).calmSpeedKmh <=
          riderFromPower({ powerW, massKg: 80, cdaM2: sleek }).calmSpeedKmh +
            1e-9
        );
      }),
      runs,
    );
  });
});

describe("terrain model invariants", () => {
  // Bounded so downhill tailwinds stay under the 144 km/h model ceiling and
  // long-lead crosswind sigma keeps the along-route wind under 30 m/s.
  const grade = fc.double({ min: -0.08, max: 0.12, noNaN: true });
  const terrainWind = fc.double({ min: -15, max: 15, noNaN: true });
  const power = fc.double({ min: 100, max: 450, noNaN: true });
  const shortLead = fc.double({ min: 0, max: 72, noNaN: true });
  it("agrees with the flat-road model on zero grade", () => {
    fc.assert(
      fc.property(legs, (route) => {
        const flat = estimateRideEffect(route);
        const terrain = estimateTerrainEffect(
          route.map((l) => ({ ...l, grade: 0 })),
        );
        return (
          Math.abs(flat.speedDeltaMps - terrain.speedDeltaMps) < 1e-6 &&
          Math.abs(flat.timeDeltaS - terrain.timeDeltaS) < 1e-3
        );
      }),
      runs,
    );
  });
  it("slows on steeper grades and speeds up with more tailwind", () => {
    fc.assert(
      fc.property(power, terrainWind, grade, grade, (p, w, a, b) => {
        const [gentle, steep] = ordered(a, b);
        return (
          solveTerrainSpeedMps(p, w, steep) <=
          solveTerrainSpeedMps(p, w, gentle) + 1e-9
        );
      }),
      runs,
    );
    fc.assert(
      fc.property(power, grade, terrainWind, terrainWind, (p, g, a, b) => {
        const [less, more] = ordered(a, b);
        return (
          solveTerrainSpeedMps(p, less, g) <=
          solveTerrainSpeedMps(p, more, g) + 1e-9
        );
      }),
      runs,
    );
  });
  it("keeps the terrain point estimate inside its band", () => {
    const hilly = fc.array(
      fc.record({
        distanceM: fc.double({ min: 10, max: 5000, noNaN: true }),
        tailwindMps: fc.double({ min: -12, max: 12, noNaN: true }),
        crosswindMps: fc.double({ min: -12, max: 12, noNaN: true }),
        grade,
      }),
      { minLength: 1, maxLength: 5 },
    );
    fc.assert(
      fc.property(hilly, shortLead, (route, leadHours) => {
        const { band, speedDeltaMps } = estimateTerrainEffect(
          route,
          referenceRider,
          leadHours,
        );
        return (
          band !== null &&
          band.speedDeltaLowMps <= speedDeltaMps + 1e-9 &&
          speedDeltaMps <= band.speedDeltaHighMps + 1e-9
        );
      }),
      runs,
    );
  });
});

describe("ride effect edge cases", () => {
  it("settles below the tailwind speed when a tailwind alone exceeds the target power", () => {
    const speed = solveSpeedMps(30, { ...referenceRider, calmSpeedKmh: 1 });
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(30);
  });
  it("omits the band for a negative or missing lead time", () => {
    const route: RideLeg[] = [{ distanceM: 1000, tailwindMps: 2 }];
    expect(
      estimateRideEffect(route, undefined, { leadHours: -1 }).band,
    ).toBeNull();
    expect(estimateRideEffect(route).band).toBeNull();
    expect(
      estimateTerrainEffect([{ ...route[0]!, grade: 0 }], referenceRider, -1)
        .band,
    ).toBeNull();
  });
  it("rejects rider inputs that are not objects or are out of range", () => {
    for (const input of [
      null,
      5,
      "rider",
      { powerW: 5000, massKg: 80, cdaM2: 0.3 },
    ])
      expect(() => riderFromPower(input as never)).toThrow("out of range");
  });
  it("rejects terrain inputs outside the supported limits", () => {
    expect(() => solveTerrainSpeedMps(300, 0, 0.5)).toThrow(
      "outside supported limits",
    );
    expect(() => solveTerrainSpeedMps(0, 0, 0)).toThrow(
      "outside supported limits",
    );
    expect(() => solveTerrainSpeedMps(300, 31, 0)).toThrow(
      "outside supported limits",
    );
  });
});
