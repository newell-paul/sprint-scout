export type Point = [number, number];
import { isShelter, type Shelter } from "@scout/application/shelter";
export type DrawnRoute = {
  id: string;
  name: string;
  points: Point[];
  confirmed: true;
  createdAt: string;
  slot: number;
  shelter?: Shelter;
  /** Heights from the rider's GPX file, one per point; display only. */
  heightsM?: number[];
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
// Heights are display only, so bad ones are dropped rather than failing the library.
function validHeights(value: unknown, points: Point[]): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === points.length &&
    value.every(
      (h) =>
        typeof h === "number" && Number.isFinite(h) && h >= -500 && h <= 9000,
    )
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
  // Terrain, efforts and targets were removed on 1 November 2026; their
  // fields are dropped whatever they hold.
  const routes = data as (Omit<DrawnRoute, "slot"> & {
    slot?: number;
    terrain?: unknown;
    terrainMode?: unknown;
    terrainAuto?: unknown;
    efforts?: unknown;
    targetTimeS?: unknown;
  })[];
  const taken = new Set(
    routes.flatMap((r) => (r.slot === undefined ? [] : [r.slot])),
  );
  if (taken.size !== routes.filter((r) => r.slot !== undefined).length)
    throw new Error("Duplicate segment slots.");
  let next = 0;
  return routes.map((stored) => {
    const r = { ...stored };
    delete r.terrain;
    delete r.terrainMode;
    delete r.terrainAuto;
    delete r.efforts;
    delete r.targetTimeS;
    if (r.heightsM !== undefined && !validHeights(r.heightsM, r.points))
      delete r.heightsM;
    if (r.slot !== undefined) return r as DrawnRoute;
    while (taken.has(next)) next++;
    taken.add(next);
    return { ...r, slot: next };
  });
}
