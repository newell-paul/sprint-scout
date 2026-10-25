import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { intentStatus } from "./dashboard";
import { staleIntents } from "./intents";

// tsx intents.cli.ts [intent directory]
// Exits 1 when an intent was built but not marked done or dropped, so a pull
// request cannot merge green with its intent left behind.
const dir = process.argv[2] ?? "intent";
const folders = readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "intent.md")))
  .map((e) => ({
    slug: e.name,
    status: intentStatus(readFileSync(join(dir, e.name, "intent.md"), "utf8")),
    plan: existsSync(join(dir, e.name, "plan.md")),
  }));
const stale = staleIntents(folders);
for (const line of stale) console.error(line);
if (stale.length) process.exit(1);
