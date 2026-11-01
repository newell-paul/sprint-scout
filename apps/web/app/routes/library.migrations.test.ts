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
  it("drops terrain, mode and auto flags but keeps shelter and target", () => {
    const [route] = readLibrary(storageFixtures.terrainMismatch);
    expect(route).toMatchObject({ shelter: "sheltered", targetTimeS: 90 });
    expect(route).not.toHaveProperty("terrain");
    expect(route).not.toHaveProperty("terrainMode");
    expect(route).not.toHaveProperty("terrainAuto");
  });
  it("keeps efforts matched to the current geometry only", () => {
    const [route] = readLibrary(storageFixtures.efforts);
    expect(route?.efforts?.map((e) => e.id)).toEqual(["e-1"]);
  });
  it("keeps unknown route fields on the first read", () => {
    for (const raw of Object.values(storageFixtures)) {
      const routes = (JSON.parse(raw) as Record<string, unknown>[]).map(
        (route) => ({ ...route, future: { kept: true } }),
      );
      for (const route of readLibrary(JSON.stringify(routes)))
        expect(route).toHaveProperty("future", { kept: true });
    }
  });
  it("round-trips each fixture unchanged on a second read", () => {
    for (const raw of Object.values(storageFixtures)) {
      const once = readLibrary(raw);
      expect(readLibrary(JSON.stringify(once))).toEqual(once);
    }
  });
});
