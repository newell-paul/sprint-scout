import { describe, expect, it } from "vitest";
import {
  estimateRideEffect,
  referencePowerW,
  referenceRider,
  riderFromPower,
} from "./ride-effect";
import {
  estimateTerrainEffect,
  solveTerrainSpeedMps,
  terrainForceN,
} from "./terrain-effect";

describe("steady-state grade-aware physics", () => {
  const leg = { distanceM: 1000, tailwindMps: 0, crosswindMps: 0, grade: 0 };
  it("matches the flat model for ordinary wind and its estimated bands", () => {
    for (const tailwindMps of [-8, 0, 8]) {
      const legs = [{ ...leg, tailwindMps }];
      const flat = estimateRideEffect(legs, referenceRider, { leadHours: 12 });
      const terrain = estimateTerrainEffect(legs, referenceRider, 12);
      expect(terrain.windSpeedMps).toBeCloseTo(flat.windSpeedMps, 9);
      expect(terrain.calmSpeedMps).toBeCloseTo(flat.calmSpeedMps, 9);
      expect(terrain.band!.speedDeltaLowMps).toBeCloseTo(
        flat.band!.speedDeltaLowMps,
        9,
      );
      expect(terrain.band!.speedDeltaHighMps).toBeCloseTo(
        flat.band!.speedDeltaHighMps,
        9,
      );
    }
  });
  it("slows uphill, accelerates downhill and does not flatten a rolling course", () => {
    const flat = estimateTerrainEffect([leg]);
    const climb = estimateTerrainEffect([{ ...leg, grade: 0.05 }]);
    const descent = estimateTerrainEffect([{ ...leg, grade: -0.05 }]);
    const rolling = estimateTerrainEffect([
      { ...leg, grade: 0.05 },
      { ...leg, grade: -0.05 },
    ]);
    expect(climb.calmSpeedMps).toBeLessThan(flat.calmSpeedMps);
    expect(descent.calmSpeedMps).toBeGreaterThan(flat.calmSpeedMps);
    expect(rolling.calmSpeedMps).toBeLessThan(flat.calmSpeedMps);
    expect(rolling.windSpeedMps).toBeCloseTo(
      2000 / (1000 / climb.windSpeedMps + 1000 / descent.windSpeedMps),
      10,
    );
    expect(climb.timeDeltaS).toBe(0);
  });
  it("conserves steady-state work at each solved speed including sub-tailwind climbs", () => {
    for (const rider of [
      referenceRider,
      riderFromPower({ powerW: 200, massKg: 90, cdaM2: 0.3 }),
    ]) {
      const power = referencePowerW(rider);
      for (const grade of [-0.1, -0.05, 0, 0.05, 0.2]) {
        for (const wind of [-10, 0, 10]) {
          const speed = solveTerrainSpeedMps(power, wind, grade, rider);
          expect(speed * terrainForceN(speed, wind, grade, rider)).toBeCloseTo(
            power,
            6,
          );
          expect(terrainForceN(speed, wind, grade, rider) * 1000).toBeCloseTo(
            (power * 1000) / speed,
            5,
          );
        }
      }
    }
    expect(solveTerrainSpeedMps(200, 15, 0.2)).toBeLessThan(15);
  });
  it("uses the same terrain for calm baseline and wind-only uncertainty", () => {
    const legs = [{ ...leg, grade: 0.05, tailwindMps: 5 }];
    const tail = estimateTerrainEffect(legs, referenceRider, 0);
    const head = estimateTerrainEffect(
      [{ ...legs[0]!, tailwindMps: -5 }],
      referenceRider,
      0,
    );
    expect(tail.calmSpeedMps).toBe(head.calmSpeedMps);
    expect(tail.timeDeltaS).toBeLessThan(0);
    expect(head.timeDeltaS).toBeGreaterThan(0);
    expect(tail.band!.speedDeltaLowMps).toBeLessThan(tail.speedDeltaMps);
    expect(tail.band!.speedDeltaHighMps).toBeGreaterThan(tail.speedDeltaMps);
    expect(estimateTerrainEffect(legs, referenceRider, 0)).toEqual(tail);
  });
  it("refuses invalid or out-of-domain inputs rather than dropping legs or capping results", () => {
    for (const grade of [NaN, Infinity, 0.31, -0.31])
      expect(() => estimateTerrainEffect([{ ...leg, grade }])).toThrow();
    expect(() =>
      estimateTerrainEffect([leg, { ...leg, distanceM: 0 }]),
    ).toThrow();
    expect(() => solveTerrainSpeedMps(200, 31, 0)).toThrow();
    expect(() => solveTerrainSpeedMps(0, 0, 0)).toThrow();
    expect(() =>
      solveTerrainSpeedMps(
        1000,
        30,
        -0.3,
        riderFromPower({ powerW: 1000, massKg: 200, cdaM2: 0.15 }),
      ),
    ).toThrow();
  });
});
