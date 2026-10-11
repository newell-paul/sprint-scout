import { describe, expect, it } from "vitest";
import { storageFixtures } from "@scout/testing/storage";
import { readLibrary } from "./library";

// Every storage shape ever written by the planner must still read cleanly.
describe("saved library migrations", () => {
  it("assigns free slots to routes saved before slots existed", () => {
    const routes = readLibrary(storageFixtures.beforeSlots);
    expect(routes.map((r) => [r.id, r.slot])).toEqual([
      ["queens-road", 0],
      ["bend", 3],
    ]);
  });
  it("nulls terrain recorded for a different geometry but keeps mode, auto and shelter", () => {
    const [route] = readLibrary(storageFixtures.terrainMismatch);
    expect(route).toMatchObject({
      terrain: null,
      terrainMode: "terrain",
      terrainAuto: true,
      shelter: "sheltered",
      targetTimeS: 90,
    });
  });
  it("keeps efforts matched to the current geometry only", () => {
    const [route] = readLibrary(storageFixtures.efforts);
    expect(route?.efforts?.map((e) => e.id)).toEqual(["e-1"]);
  });
  it("round-trips each fixture unchanged on a second read", () => {
    for (const raw of Object.values(storageFixtures)) {
      const once = readLibrary(raw);
      expect(readLibrary(JSON.stringify(once))).toEqual(once);
    }
  });
});
