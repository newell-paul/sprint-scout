import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const tmp = mkdtempSync(path.join(os.tmpdir(), "scout-dashboard-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const build = (...args: string[]) =>
  spawnSync(
    path.join(root, "node_modules/.bin/tsx"),
    [path.join(root, "packages/testing/src/dashboard.cli.ts"), ...args],
    { cwd: root, encoding: "utf8" },
  );
const dates = (dir: string) =>
  (
    JSON.parse(readFileSync(path.join(dir, "history.json"), "utf8")) as {
      date: string;
    }[]
  ).map((s) => s.date);

describe("dashboard CLI", () => {
  // `pnpm dashboard` passes a local --history and CI appends the downloaded
  // one, so the later flag has to win or CI starts from nothing every run.
  it("keeps the history named by the last --history flag", () => {
    const first = path.join(tmp, "first");
    const second = path.join(tmp, "second");
    expect(build("--out", first, "--date", "2026-10-24").status).toBe(0);
    const run = build(
      "--out",
      second,
      "--history",
      path.join(tmp, "absent.json"),
      "--history",
      path.join(first, "history.json"),
      "--date",
      "2026-10-25",
    );
    expect(run.status).toBe(0);
    expect(dates(second)).toEqual(["2026-10-24", "2026-10-25"]);
  }, 30_000);
});
