import { describe, expect, it } from "vitest";
import {
  alongRouteSigmaMps,
  estimateRideEffect,
  riderHeightFactor,
  scaleToRiderHeight,
  referencePowerW,
  referenceRider,
  solveSpeedAtPowerMps,
  solveSpeedMps,
} from "./ride-effect";

const REF = 1.32;
describe("ride effect", () => {
  it("holds 40 km/h in calm air at a plausible power", () => {
    expect(solveSpeedMps(0)).toBeCloseTo(40 / 3.6, 6);
    expect(referencePowerW()).toBeGreaterThan(250);
    expect(referencePowerW()).toBeLessThan(400);
  });
  it("does not force a low-power rider up to the tailwind speed", () => {
    const heavy = { ...referenceRider, massKg: 200 };
    const at50 = solveSpeedAtPowerMps(50, 10, heavy);
    const at100 = solveSpeedAtPowerMps(100, 10, heavy);
    expect(at50).toBeGreaterThan(0);
    expect(at50).toBeLessThan(10);
    expect(at100).toBeGreaterThan(at50);
    const power = (v: number) =>
      v *
      (0.5 * heavy.airDensity * heavy.cdaM2 * (v - 10) * Math.abs(v - 10) +
        heavy.crr * heavy.massKg * 9.80665);
    expect(power(at50)).toBeCloseTo(50, 6);
    expect(power(at100)).toBeCloseTo(100, 6);
  });
  it("coasts at the free-rolling speed when no power is applied", () => {
    expect(solveSpeedAtPowerMps(0, 0)).toBe(0);
    // A strong tailwind alone moves the rider until drag balances rolling resistance.
    const free = solveSpeedAtPowerMps(0, 20);
    const k = 0.5 * referenceRider.airDensity * referenceRider.cdaM2;
    const c = referenceRider.crr * referenceRider.massKg * 9.80665;
    expect(free).toBeCloseTo(20 - Math.sqrt(c / k), 9);
  });
  it("is zero with no wind", () => {
    const effect = estimateRideEffect([{ distanceM: 1000, tailwindMps: 0 }]);
    expect(effect.speedDeltaMps).toBe(0);
    expect(effect.timeDeltaS).toBe(0);
  });
  it("speeds up with tailwind and a headwind costs more time than it gains", () => {
    const tail = estimateRideEffect([{ distanceM: 1000, tailwindMps: 4 }]);
    const head = estimateRideEffect([{ distanceM: 1000, tailwindMps: -4 }]);
    expect(tail.speedDeltaMps).toBeGreaterThan(0);
    expect(head.speedDeltaMps).toBeLessThan(0);
    expect(tail.timeDeltaS).toBeLessThan(0);
    expect(head.timeDeltaS).toBeGreaterThan(Math.abs(tail.timeDeltaS));
  });
  it("weights legs by time so headwind legs dominate", () => {
    const mixed = estimateRideEffect([
      { distanceM: 500, tailwindMps: 5 },
      { distanceM: 500, tailwindMps: -5 },
    ]);
    expect(mixed.speedDeltaMps).toBeLessThan(0);
  });
  it("is deterministic and bounded for extreme wind", () => {
    expect(solveSpeedMps(100)).toBe(solveSpeedMps(30));
    expect(solveSpeedMps(-100)).toBeGreaterThan(0);
    expect(solveSpeedMps(30)).toBeLessThanOrEqual(40);
  });
  it("matches a fixed reference value", () => {
    const effect = estimateRideEffect([{ distanceM: 2000, tailwindMps: 3 }]);
    expect(effect.rider).toEqual(referenceRider);
    expect(effect.calmSpeedMps).toBeCloseTo(40 / 3.6, 6);
    expect(effect.speedDeltaMps).toBeCloseTo(REF, 2);
  });
  it("scales 10 m forecast wind down to handlebar height", () => {
    expect(riderHeightFactor).toBeCloseTo(0.673, 3);
    expect(scaleToRiderHeight(4)).toBeCloseTo(2.69, 2);
    const raw = estimateRideEffect([{ distanceM: 1000, tailwindMps: 4 }]);
    const direct = solveSpeedMps(4) - 40 / 3.6;
    expect(raw.speedDeltaMps).toBeLessThan(direct);
    expect(raw.riderHeightFactor).toBe(riderHeightFactor);
  });
  it("widens the confidence band with lead time and near-perpendicular wind", () => {
    const soon = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 3, crosswindMps: 0 }],
      referenceRider,
      { leadHours: 1 },
    );
    const later = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 3, crosswindMps: 0 }],
      referenceRider,
      { leadHours: 47 },
    );
    const width = (e: typeof soon) =>
      e.band!.speedDeltaHighMps - e.band!.speedDeltaLowMps;
    expect(soon.band?.speedDeltaLowMps).toBeLessThan(soon.speedDeltaMps);
    expect(soon.band?.speedDeltaHighMps).toBeGreaterThan(soon.speedDeltaMps);
    expect(width(later)).toBeGreaterThan(width(soon));
    expect(alongRouteSigmaMps(0, 5, 24)).toBeGreaterThan(
      alongRouteSigmaMps(5, 0, 24),
    );
    expect(
      estimateRideEffect([{ distanceM: 1000, tailwindMps: 3 }]).band,
    ).toBeNull();
  });
  it("rejects empty or invalid legs", () => {
    expect(() => estimateRideEffect([])).toThrow();
    expect(() =>
      estimateRideEffect([{ distanceM: 0, tailwindMps: 1 }]),
    ).toThrow();
  });
});

describe("rider from power", () => {
  it("round-trips the reference rider's power to 40 km/h", async () => {
    const { riderFromPower, isRiderInput, riderLimits } =
      await import("./ride-effect");
    const rider = riderFromPower({
      powerW: referencePowerW(),
      massKg: referenceRider.massKg,
      cdaM2: referenceRider.cdaM2,
    });
    expect(rider.calmSpeedKmh).toBeCloseTo(40, 6);
    expect(referencePowerW(rider)).toBeCloseTo(referencePowerW(), 6);
    expect(isRiderInput({ powerW: 250, massKg: 80, cdaM2: 0.3 })).toBe(true);
    expect(
      isRiderInput({
        powerW: riderLimits.powerW.max + 1,
        massKg: 80,
        cdaM2: 0.3,
      }),
    ).toBe(false);
    expect(isRiderInput({ powerW: "250", massKg: 80, cdaM2: 0.3 })).toBe(false);
    expect(() =>
      riderFromPower({ powerW: 10, massKg: 80, cdaM2: 0.3 }),
    ).toThrow();
  });
  it("more power or less drag means a faster calm speed", async () => {
    const { riderFromPower } = await import("./ride-effect");
    const base = riderFromPower({ powerW: 250, massKg: 85, cdaM2: 0.36 });
    const strong = riderFromPower({ powerW: 350, massKg: 85, cdaM2: 0.36 });
    const aero = riderFromPower({ powerW: 250, massKg: 85, cdaM2: 0.25 });
    expect(strong.calmSpeedKmh).toBeGreaterThan(base.calmSpeedKmh);
    expect(aero.calmSpeedKmh).toBeGreaterThan(base.calmSpeedKmh);
    const tail = estimateRideEffect(
      [{ distanceM: 1000, tailwindMps: 4 }],
      aero,
    );
    expect(tail.rider.calmSpeedKmh).toBeCloseTo(aero.calmSpeedKmh, 8);
    expect(tail.speedDeltaMps).toBeGreaterThan(0);
  });
});
