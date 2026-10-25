import { describe, expect, it } from "vitest";
import {
  clearSavedData,
  needsWind,
  newId,
  nextFreeSlot,
  readLibrary,
  validPoint,
} from "./library";
import { sampleTerrain, type TerrainProfile } from "@scout/application/terrain";
const route = {
  id: "test",
  name: "Ride",
  points: [
    [0, 51],
    [0.01, 51.01],
  ],
  confirmed: true,
  createdAt: "2026-09-09T12:00:00Z",
  slot: 0,
};
describe("independent route storage", () => {
  it("persists named shelter choices and rejects unknown values", () => {
    for (const shelter of ["exposed", "sheltered", "dense"])
      expect(
        readLibrary(JSON.stringify([{ ...route, shelter }]))[0]?.shelter,
      ).toBe(shelter);
    expect(() =>
      readLibrary(JSON.stringify([{ ...route, shelter: "unknown" }])),
    ).toThrow();
  });
  it("retains valid terrain and invalidates mismatched elevation without losing the route", () => {
    const terrain: TerrainProfile = {
      version: "glo90-profile-v1",
      geometryKey: JSON.stringify(route.points),
      source: "Open-Meteo / Copernicus DEM GLO-90 2021",
      retrievedAt: route.createdAt,
      elevationsM: sampleTerrain(route.points).points.map(() => 100),
    };
    const saved = { ...route, terrain, terrainMode: "terrain" };
    expect(readLibrary(JSON.stringify([saved]))[0]?.terrain).toEqual(terrain);
    const changed = readLibrary(
      JSON.stringify([{ ...saved, points: [...route.points].reverse() }]),
    );
    expect(changed[0]?.terrain).toBeNull();
    expect(changed[0]?.terrainMode).toBe("terrain");
    expect(changed[0]?.name).toBe(route.name);
    expect(
      readLibrary(
        JSON.stringify([
          { ...saved, terrain: { ...terrain, elevationsM: [null] } },
        ]),
      )[0]?.terrain,
    ).toBeNull();
  });
  it("keeps the automatic terrain setting and rejects non-boolean values", () => {
    expect(
      readLibrary(JSON.stringify([{ ...route, terrainAuto: true }]))[0]
        ?.terrainAuto,
    ).toBe(true);
    expect(() =>
      readLibrary(JSON.stringify([{ ...route, terrainAuto: "yes" }])),
    ).toThrow();
  });
  it("round trips ordered geometry and confirmation", () => {
    expect(readLibrary(JSON.stringify([route]))).toEqual([route]);
    expect(readLibrary(null)).toEqual([]);
  });
  it("rejects corrupt storage, duplicates, missing consent and degenerate geometry", () => {
    for (const value of [
      "{",
      JSON.stringify([route, route]),
      JSON.stringify([{ ...route, confirmed: false }]),
      JSON.stringify([
        {
          ...route,
          points: [
            [0, 51],
            [0, 51],
          ],
        },
      ]),
      JSON.stringify([route, { ...route, id: "other" }]),
      JSON.stringify([{ ...route, slot: -1 }]),
      JSON.stringify([{ ...route, slot: Number.MAX_SAFE_INTEGER }]),
      JSON.stringify([{ ...route, slot: 1.5 }]),
    ])
      expect(() => readLibrary(value)).toThrow();
  });
  it("assigns free slots to routes saved before slots existed", () => {
    const legacy = { ...route } as Partial<typeof route>;
    delete legacy.slot;
    const rows = readLibrary(
      JSON.stringify([
        { ...legacy, id: "a" },
        { ...route, id: "b", slot: 1 },
        { ...legacy, id: "c" },
      ]),
    );
    expect(rows.map((r) => r.slot)).toEqual([0, 1, 2]);
  });
  it("keeps more than five segments and reuses gaps without renumbering", () => {
    const routes = Array.from({ length: 30 }, (_, position) => ({
      ...route,
      id: String(position),
      slot: position,
    }));
    expect(readLibrary(JSON.stringify(routes))).toEqual(routes);
    expect(nextFreeSlot(routes)).toBe(30);
    const withGap = routes.filter((item) => item.slot !== 7);
    expect(readLibrary(JSON.stringify(withGap))).toEqual(withGap);
    expect(nextFreeSlot(withGap)).toBe(7);
    expect(nextFreeSlot([])).toBe(0);
    expect(() => readLibrary(" ".repeat(1_000_001))).toThrow("too large");
  });
  it("bounds points and coordinates", () => {
    expect(validPoint([181, 0])).toBe(false);
    expect(validPoint([0, NaN])).toBe(false);
    expect(validPoint([0, 86])).toBe(false);
    expect(() =>
      readLibrary(
        JSON.stringify([
          {
            ...route,
            points: Array.from({ length: 501 }, (_, i) => [i / 100, 51]),
          },
        ]),
      ),
    ).toThrow();
  });
  it("keeps valid efforts, drops efforts from other geometry and rejects malformed ones", () => {
    const effort = {
      id: "e1",
      startedAt: "2026-09-12T09:00:30.000Z",
      elapsedSeconds: 112.4,
      source: "gpx",
      fileName: "ride.gpx",
      geometryKey: JSON.stringify(route.points),
      maxDeviationM: 3.2,
      sampleGapSeconds: 1,
      importedAt: "2026-09-13T10:00:00.000Z",
    };
    const stale = { ...effort, id: "e2", geometryKey: "[]" };
    expect(
      readLibrary(JSON.stringify([{ ...route, efforts: [effort, stale] }]))[0]
        ?.efforts,
    ).toEqual([effort]);
    for (const bad of [
      { ...effort, elapsedSeconds: 0 },
      { ...effort, elapsedSeconds: 86401 },
      { ...effort, source: "strava" },
      { ...effort, startedAt: "yesterday" },
      { ...effort, maxDeviationM: -1 },
    ])
      expect(() =>
        readLibrary(JSON.stringify([{ ...route, efforts: [bad] }])),
      ).toThrow();
    expect(() =>
      readLibrary(JSON.stringify([{ ...route, efforts: [effort, effort] }])),
    ).toThrow();
  });
});

describe("saved effort times and wind", () => {
  const effort = {
    id: "e1",
    startedAt: "2026-09-12T09:00:30.000Z",
    elapsedSeconds: 112.4,
    source: "gpx",
    fileName: "ride.gpx",
    geometryKey: JSON.stringify(route.points),
    maxDeviationM: 3.2,
    sampleGapSeconds: 1,
    importedAt: "2026-09-13T10:00:00.000Z",
  };
  const wind = {
    speedMps: 4,
    fromDegrees: 180,
    gustMps: null,
    precipitationMm: 0,
    retrievedAt: "2026-09-14T08:00:00.000Z",
    source: "open-meteo-archive",
  };
  const read = (efforts: unknown[]) =>
    readLibrary(JSON.stringify([{ ...route, efforts }]))[0]?.efforts;
  it("reads zoned times back as UTC instants so sorting and duplicate checks compare like with like", () => {
    const [saved] = read([
      {
        ...effort,
        startedAt: "2026-09-12T10:00:30+01:00",
        importedAt: "2026-09-13T10:00:00Z",
        wind: { ...wind, retrievedAt: "2026-09-14T09:00:00+01:00" },
      },
    ])!;
    expect(saved!.startedAt).toBe("2026-09-12T09:00:30.000Z");
    expect(saved!.importedAt).toBe("2026-09-13T10:00:00.000Z");
    expect(saved!.wind!.retrievedAt).toBe("2026-09-14T08:00:00.000Z");
  });
  it("rejects a time without a zone, which each device would read differently", () => {
    for (const bad of [
      { ...effort, startedAt: "2026-09-12T09:00:30" },
      { ...effort, importedAt: "2026-09-13" },
      { ...effort, wind: { ...wind, retrievedAt: "2026-09-14T08:00:00" } },
    ])
      expect(() => read([bad])).toThrow();
  });
  it("needs a direction for any wind above calm", () => {
    expect(() =>
      read([{ ...effort, wind: { ...wind, fromDegrees: null } }]),
    ).toThrow();
    expect(
      read([{ ...effort, wind: { ...wind, speedMps: 0, fromDegrees: null } }]),
    ).toHaveLength(1);
    expect(
      read([
        { ...effort, wind: { ...wind, speedMps: null, fromDegrees: null } },
      ]),
    ).toHaveLength(1);
  });
});
describe("newId", () => {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  it("uses randomUUID when the context is secure", () => {
    const c = {
      randomUUID: () => "fixed",
      getRandomValues: () => {
        throw new Error("unused");
      },
    } as unknown as Crypto;
    expect(newId(c)).toBe("fixed");
  });
  it("falls back to a v4-shaped id from getRandomValues over plain HTTP", () => {
    const c = {
      getRandomValues: (a: Uint8Array) => crypto.getRandomValues(a),
    } as unknown as Crypto;
    expect(newId(c)).toMatch(uuid);
    expect(newId(c)).not.toBe(newId(c));
  });
});

describe("needsWind", () => {
  const wind = {
    fromDegrees: 200,
    gustMps: 8,
    precipitationMm: 0,
    retrievedAt: "2026-09-13T12:00:00Z",
    source: "open-meteo-archive" as const,
  };
  it("retries efforts whose archive hour had no usable wind", () => {
    expect(needsWind({})).toBe(true);
    expect(needsWind({ wind: null })).toBe(true);
    expect(needsWind({ wind: { ...wind, speedMps: null } })).toBe(true);
    expect(needsWind({ wind: { ...wind, speedMps: 4 } })).toBe(false);
    expect(needsWind({ wind: { ...wind, speedMps: 0 } })).toBe(false);
  });
});

describe("clearSavedData", () => {
  it("removes every planner key and leaves other sites' keys alone", () => {
    const store = new Map<string, string>([
      ["sprint-scout.drawn-routes.v1", "[]"],
      ["sprint-scout.rider.v1", "{}"],
      ["other-app.settings", "{}"],
    ]);
    const storage = {
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      removeItem: (key: string) => void store.delete(key),
    };

    clearSavedData(storage);

    expect([...store.keys()]).toEqual(["other-app.settings"]);
  });
});
