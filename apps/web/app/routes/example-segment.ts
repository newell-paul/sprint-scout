import { storageKey, type DrawnRoute, type Point } from "./library";

// A starter segment for an empty library: 593 m of park road heading west
// from Roehampton Gate in Richmond Park, London. The geometry was routed on
// OpenStreetMap roads (© OpenStreetMap contributors, ODbL) between two
// coordinates; nothing here is taken from Strava.
export const exampleSegment = {
  name: "Richmond Park (example)",
  points: [
    [-0.259056, 51.453153],
    [-0.259092, 51.453141],
    [-0.259139, 51.453142],
    [-0.259226, 51.453119],
    [-0.259318, 51.453091],
    [-0.259342, 51.453069],
    [-0.259867, 51.452947],
    [-0.260895, 51.452722],
    [-0.261786, 51.452546],
    [-0.263322, 51.452269],
    [-0.263965, 51.45216],
    [-0.264791, 51.452041],
    [-0.265663, 51.451936],
    [-0.266024, 51.451899],
    [-0.266365, 51.451875],
    [-0.266665, 51.451873],
    [-0.267048, 51.451888],
    [-0.267279, 51.451898],
  ] as readonly Point[],
} as const;

/** The example as an ordinary saved route, deletable like any other. */
export function exampleRoute(input: {
  id: string;
  slot: number;
  createdAt: string;
}): DrawnRoute {
  return {
    id: input.id,
    name: exampleSegment.name,
    points: exampleSegment.points.map((p) => [p[0], p[1]]),
    confirmed: true,
    createdAt: input.createdAt,
    slot: input.slot,
    targetTimeS: null,
    terrain: null,
    terrainMode: "flat",
    terrainAuto: false,
    shelter: "exposed",
    efforts: [],
  };
}

/**
 * On the very first visit the library key is absent; write the example into
 * the first slot so the planner opens populated. A library the user has emptied is
 * stored as `[]`, so a deleted example never comes back.
 */
export function seedExampleOnFirstVisit(
  storage: Pick<Storage, "getItem" | "setItem">,
  input: { id: string; createdAt: string },
): boolean {
  if (storage.getItem(storageKey) !== null) return false;
  storage.setItem(
    storageKey,
    JSON.stringify([exampleRoute({ ...input, slot: 0 })]),
  );
  return true;
}
