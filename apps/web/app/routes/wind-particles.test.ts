import { describe, expect, it } from "vitest";
import {
  particleCount,
  pixelsPerSecond,
  seededRandom,
  velocity,
} from "./wind-particles";

describe("wind particles", () => {
  it("moves particles in the flow direction", () => {
    const east = velocity({ flowDegrees: 90, speedMps: 5 });
    expect(east.vx).toBeCloseTo(pixelsPerSecond(5));
    expect(east.vy).toBeCloseTo(0);
    const north = velocity({ flowDegrees: 0, speedMps: 5 });
    expect(north.vx).toBeCloseTo(0);
    expect(north.vy).toBeCloseTo(-pixelsPerSecond(5));
    const south = velocity({ flowDegrees: 180, speedMps: 5 });
    expect(south.vy).toBeCloseTo(pixelsPerSecond(5));
  });
  it("scales speed with wind and caps it", () => {
    expect(pixelsPerSecond(0)).toBe(30);
    expect(pixelsPerSecond(10)).toBeGreaterThan(pixelsPerSecond(2));
    expect(pixelsPerSecond(100)).toBe(pixelsPerSecond(40));
  });
  it("bounds particle count by area", () => {
    expect(particleCount(10, 10)).toBe(120);
    expect(particleCount(800, 500)).toBe(154);
    expect(particleCount(4000, 4000)).toBe(1600);
  });
  it("is deterministic for a seed", () => {
    const a = seededRandom(7),
      b = seededRandom(7);
    const xs = [a(), a(), a()];
    expect(xs).toEqual([b(), b(), b()]);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
