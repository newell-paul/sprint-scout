import { describe, expect, it } from "vitest";
import {
  exampleRoute,
  exampleSegment,
  seedExampleOnFirstVisit,
} from "./example-segment";
import { readLibrary, storageKey, validPoint } from "./library";

describe("example segment", () => {
  it("is a valid, short, west-bound route from Roehampton Gate", () => {
    expect(exampleSegment.points.length).toBeGreaterThanOrEqual(2);
    for (const point of exampleSegment.points)
      expect(validPoint(point)).toBe(true);
    const [first, last] = [
      exampleSegment.points[0]!,
      exampleSegment.points.at(-1)!,
    ];
    expect(first[1]).toBeCloseTo(51.4532, 3);
    expect(first[0]).toBeCloseTo(-0.2591, 3);
    expect(last[0]).toBeLessThan(first[0]);
  });
  it("round-trips through the saved library unchanged", () => {
    const route = exampleRoute({
      id: "example",
      slot: 2,
      createdAt: "2026-10-09T12:00:00Z",
    });
    expect(readLibrary(JSON.stringify([route]))).toEqual([route]);
    expect(route.points).not.toBe(exampleSegment.points);
  });
  it("seeds slot 1 on the first visit only, never after the user emptied it", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    const input = { id: "example", createdAt: "2026-10-09T12:00:00Z" };
    expect(seedExampleOnFirstVisit(storage, input)).toBe(true);
    expect(readLibrary(storage.getItem(storageKey))).toEqual([
      exampleRoute({ ...input, slot: 0 }),
    ]);
    expect(seedExampleOnFirstVisit(storage, input)).toBe(false);
    store.set(storageKey, "[]");
    expect(seedExampleOnFirstVisit(storage, input)).toBe(false);
    expect(storage.getItem(storageKey)).toBe("[]");
  });
});
