import type { Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { demoSegments } from "@scout/providers";
import { withPermittedSources } from "@scout/application";
import { demoSegmentsTable } from "./index";

// Both steps are re-runnable: migrate only creates what is missing and seed
// skips rows that already exist, which the integration suite asserts.
export async function migrate(sql: Sql) {
  await sql.begin(async (tx) => {
    await tx`CREATE EXTENSION IF NOT EXISTS postgis`;
    await tx`CREATE TABLE IF NOT EXISTS demo_segments (id text PRIMARY KEY, payload jsonb NOT NULL CHECK (payload->'provenance'->>'sourceKind' = 'synthetic'))`;
  });
}
export function demoRows(now = new Date()) {
  return withPermittedSources(
    demoSegments.map((s) => s.provenance),
    "persistence",
    now,
    () => demoSegments.map((s) => ({ id: s.id, payload: s })),
  );
}
export async function seed(sql: Sql, rows = demoRows()) {
  await drizzle(sql)
    .insert(demoSegmentsTable)
    .values(rows)
    .onConflictDoNothing();
  return rows.length;
}
