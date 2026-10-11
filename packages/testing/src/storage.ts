// Recorded browser libraries from each storage shape the planner has shipped.
// The reader must migrate every one of these forever; add a fixture whenever a
// field is added, never edit an old one.
import beforeSlots from "../fixtures/storage/v1-before-slots.json" with { type: "json" };
import terrainMismatch from "../fixtures/storage/v1-terrain-mismatch.json" with { type: "json" };
import efforts from "../fixtures/storage/v1-efforts.json" with { type: "json" };

export const storageFixtures = {
  /** Routes saved before slots existed; one already has a slot. */
  beforeSlots: JSON.stringify(beforeSlots),
  /** Terrain recorded for an older geometry; mode and auto flags must survive. */
  terrainMismatch: JSON.stringify(terrainMismatch),
  /** Efforts, one of them matched to a previous geometry. */
  efforts: JSON.stringify(efforts),
} as const;
