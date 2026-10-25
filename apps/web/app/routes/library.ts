import {
  validTerrainProfile,
  type TerrainProfile,
} from "@scout/application/terrain";
export type Point = [number, number];
import { isShelter, type Shelter } from "@scout/application/shelter";
export type EffortWind = {
  speedMps: number | null;
  fromDegrees: number | null;
  gustMps: number | null;
  precipitationMm: number | null;
  retrievedAt: string;
  source: "open-meteo-archive";
};
export type RouteEffort = {
  id: string;
  startedAt: string;
  elapsedSeconds: number;
  source: "gpx";
  fileName: string;
  geometryKey: string;
  maxDeviationM: number;
  sampleGapSeconds: number;
  importedAt: string;
  wind?: EffortWind | null;
};
export const effortLimits = { perRoute: 200 } as const;
/** Wind never fetched, or fetched with no usable hour: both stay retryable. */
export const needsWind = (effort: Pick<RouteEffort, "wind">) =>
  !effort.wind || effort.wind.speedMps === null;
export type DrawnRoute = {
  id: string;
  name: string;
  points: Point[];
  confirmed: true;
  createdAt: string;
  slot: number;
  targetTimeS?: number | null;
  terrain?: TerrainProfile | null;
  terrainMode?: "flat" | "terrain";
  terrainAuto?: boolean;
  shelter?: Shelter;
  efforts?: RouteEffort[];
};
export const storageKey = "sprint-scout.drawn-routes.v1";
// Every key the planner writes starts with this prefix, so a wipe also covers
// keys added later; another app on the same origin keeps its own.
export function clearSavedData(
  storage: Pick<Storage, "length" | "key" | "removeItem">,
) {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
  for (const key of keys)
    if (key?.startsWith("sprint-scout.")) storage.removeItem(key);
}
// crypto.randomUUID exists only in secure contexts, so a phone opening the dev
// server over plain HTTP on a LAN address has getRandomValues but not it.
export function newId(c: Crypto = crypto): string {
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function nextFreeSlot(routes: readonly Pick<DrawnRoute, "slot">[]) {
  const taken = new Set(routes.map((route) => route.slot));
  let slot = 0;
  while (taken.has(slot)) slot++;
  return slot;
}
function validWind(value: unknown): value is EffortWind {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<EffortWind>;
  const bounded = (n: unknown, max: number) =>
    n === null ||
    (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max);
  return (
    v.source === "open-meteo-archive" &&
    typeof v.retrievedAt === "string" &&
    Number.isFinite(Date.parse(v.retrievedAt)) &&
    bounded(v.speedMps, 150) &&
    (v.fromDegrees === null ||
      (typeof v.fromDegrees === "number" &&
        v.fromDegrees >= 0 &&
        v.fromDegrees < 360)) &&
    bounded(v.gustMps, 150) &&
    bounded(v.precipitationMm, 1000)
  );
}
function validEffort(value: unknown): value is RouteEffort {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RouteEffort>;
  return (
    (v.wind === undefined || v.wind === null || validWind(v.wind)) &&
    typeof v.id === "string" &&
    v.id.length > 0 &&
    v.id.length <= 80 &&
    typeof v.startedAt === "string" &&
    Number.isFinite(Date.parse(v.startedAt)) &&
    typeof v.elapsedSeconds === "number" &&
    Number.isFinite(v.elapsedSeconds) &&
    v.elapsedSeconds > 0 &&
    v.elapsedSeconds <= 86400 &&
    v.source === "gpx" &&
    typeof v.fileName === "string" &&
    v.fileName.length <= 200 &&
    typeof v.geometryKey === "string" &&
    typeof v.maxDeviationM === "number" &&
    Number.isFinite(v.maxDeviationM) &&
    v.maxDeviationM >= 0 &&
    typeof v.sampleGapSeconds === "number" &&
    Number.isFinite(v.sampleGapSeconds) &&
    v.sampleGapSeconds >= 0 &&
    typeof v.importedAt === "string" &&
    Number.isFinite(Date.parse(v.importedAt))
  );
}
export function validPoint(value: unknown): value is Point {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(Number.isFinite) &&
    Math.abs(value[0] as number) <= 180 &&
    Math.abs(value[1] as number) <= 85
  );
}
// Routes saved before slots existed carry no slot; they are assigned in order.
export function readLibrary(raw: string | null): DrawnRoute[] {
  if (raw === null) return [];
  if (raw.length > 1_000_000) throw new Error("Saved library is too large.");
  const data: unknown = JSON.parse(raw);
  if (
    !Array.isArray(data) ||
    !data.every((r: unknown) => {
      if (!r || typeof r !== "object") return false;
      const v = r as Partial<DrawnRoute>;
      return (
        (v.shelter === undefined || isShelter(v.shelter)) &&
        (v.terrainAuto === undefined || typeof v.terrainAuto === "boolean") &&
        (v.efforts === undefined ||
          (Array.isArray(v.efforts) &&
            v.efforts.length <= effortLimits.perRoute &&
            v.efforts.every(validEffort) &&
            new Set(v.efforts.map((e) => e.id)).size === v.efforts.length)) &&
        (v.targetTimeS == null ||
          (Number.isInteger(v.targetTimeS) &&
            v.targetTimeS > 0 &&
            v.targetTimeS <= 86400)) &&
        (v.slot === undefined ||
          (Number.isSafeInteger(v.slot) &&
            (v.slot as number) >= 0 &&
            (v.slot as number) < Number.MAX_SAFE_INTEGER)) &&
        typeof v.id === "string" &&
        v.id.length <= 80 &&
        typeof v.name === "string" &&
        v.name.trim().length > 0 &&
        v.name.length <= 100 &&
        v.confirmed === true &&
        typeof v.createdAt === "string" &&
        Number.isFinite(Date.parse(v.createdAt)) &&
        Array.isArray(v.points) &&
        v.points.length >= 2 &&
        v.points.length <= 500 &&
        v.points.every(validPoint) &&
        v.points.some(
          (p) => p[0] !== v.points?.[0]?.[0] || p[1] !== v.points?.[0]?.[1],
        )
      );
    })
  )
    throw new Error(
      "Saved library is invalid; existing data has been preserved.",
    );
  if (new Set(data.map((r) => (r as DrawnRoute).id)).size !== data.length)
    throw new Error("Duplicate route IDs.");
  const routes = data as (Omit<DrawnRoute, "slot"> & { slot?: number })[];
  const taken = new Set(
    routes.flatMap((r) => (r.slot === undefined ? [] : [r.slot])),
  );
  if (taken.size !== routes.filter((r) => r.slot !== undefined).length)
    throw new Error("Duplicate segment slots.");
  let next = 0;
  return routes.map((r) => {
    const terrain =
      r.terrain === undefined
        ? {}
        : {
            terrain: validTerrainProfile(r.terrain, r.points)
              ? r.terrain
              : null,
          };
    const terrainMode =
      r.terrainMode === undefined
        ? {}
        : {
            terrainMode:
              r.terrainMode === "flat"
                ? ("flat" as const)
                : ("terrain" as const),
          };
    // Efforts belong to the geometry they were matched against.
    const key = JSON.stringify(r.points);
    const efforts =
      r.efforts === undefined
        ? {}
        : { efforts: r.efforts.filter((e) => e.geometryKey === key) };
    if (r.slot !== undefined)
      return { ...r, ...terrain, ...terrainMode, ...efforts } as DrawnRoute;
    while (taken.has(next)) next++;
    taken.add(next);
    return { ...r, ...terrain, ...terrainMode, ...efforts, slot: next };
  });
}
