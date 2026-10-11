import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { demoSegments } from "@scout/providers";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { connect } from "./connection";
import { demoRows, migrate, seed } from "./schema";

// Runs the foundation commands against a throwaway Postgres (same image as
// compose.yaml) and asserts what CI used to only execute: migrate and seed
// are idempotent, and the table refuses anything that is not synthetic.
let container: StartedPostgreSqlContainer;
let sql: ReturnType<typeof connect>;
const original = process.env.DATABASE_URL;
beforeAll(async () => {
  container = await new PostgreSqlContainer("postgis/postgis:17-3.5")
    .withDatabase("scout_demo")
    .withUsername("demo")
    .withPassword("demo_local_only")
    .start();
  process.env.DATABASE_URL = container.getConnectionUri();
}, 300_000);
beforeEach(async () => {
  sql = connect();
  await sql`DROP TABLE IF EXISTS demo_segments`;
});
afterEach(async () => {
  await sql.end();
});
afterAll(async () => {
  process.env.DATABASE_URL = original;
  await container?.stop();
});
const columns = () =>
  sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'demo_segments' ORDER BY ordinal_position`;

it("migrate creates the extension and table once and changes nothing on a rerun", async () => {
  await migrate(sql);
  const first = await columns();
  expect(first.map((c) => [c.column_name, c.data_type, c.is_nullable])).toEqual(
    [
      ["id", "text", "NO"],
      ["payload", "jsonb", "NO"],
    ],
  );
  await migrate(sql);
  expect(await columns()).toEqual(first);
  expect(
    await sql`SELECT extname FROM pg_extension WHERE extname = 'postgis'`,
  ).toHaveLength(1);
});

it("seed inserts every demo segment exactly once however often it runs", async () => {
  await migrate(sql);
  expect(await seed(sql)).toBe(demoSegments.length);
  await seed(sql);
  const rows = await sql`SELECT id FROM demo_segments ORDER BY id`;
  expect(rows.map((r) => r.id)).toEqual(demoSegments.map((s) => s.id).sort());
});

it("rejects a payload whose provenance is not synthetic", async () => {
  await migrate(sql);
  const [row] = demoRows();
  const forged = structuredClone(row!.payload);
  forged.provenance.sourceKind = "strava-rest";
  await expect(
    sql`INSERT INTO demo_segments (id, payload) VALUES ('forged', ${sql.json(forged as never)})`,
  ).rejects.toMatchObject({ code: "23514" });
  expect(await sql`SELECT count(*)::int AS n FROM demo_segments`).toEqual([
    { n: 0 },
  ]);
});

it("connect refuses anything but the local scout_demo database", () => {
  const url = process.env.DATABASE_URL;
  try {
    process.env.DATABASE_URL =
      "postgresql://demo:x@db.example.com:5432/scout_demo";
    expect(() => connect()).toThrow(/local scout_demo database/);
    process.env.DATABASE_URL = "postgresql://demo:x@127.0.0.1:5432/production";
    expect(() => connect()).toThrow(/local scout_demo database/);
  } finally {
    process.env.DATABASE_URL = url;
  }
});
