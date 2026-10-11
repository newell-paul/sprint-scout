import { pgTable, text, jsonb } from "drizzle-orm/pg-core";
import type { Segment } from "@scout/contracts";
export const demoSegmentsTable = pgTable("demo_segments", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<Segment>().notNull(),
});
