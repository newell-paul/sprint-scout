// scripts/osv-diff.mjs decides whether the OSV check fails a pull request, so
// it runs here as a child process exactly as CI runs it.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/osv-diff.mjs",
);
const tmp = mkdtempSync(path.join(os.tmpdir(), "osv-diff-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

type Finding = {
  name: string;
  version: string;
  ids: string[];
  aliases?: string[];
  severity?: string;
};

let files = 0;
const results = (findings: Finding[]) => {
  const file = path.join(tmp, `${++files}.json`);
  writeFileSync(
    file,
    JSON.stringify({
      results: [
        {
          source: { path: "pnpm-lock.yaml", type: "lockfile" },
          packages: findings.map((f) => ({
            package: { name: f.name, version: f.version, ecosystem: "npm" },
            groups: [
              {
                ids: f.ids,
                aliases: f.aliases ?? f.ids,
                max_severity: f.severity,
              },
            ],
          })),
        },
      ],
    }),
  );
  return file;
};
const diff = (...args: string[]) =>
  spawnSync("node", [script, ...args], { encoding: "utf8" });
const section = (out: string, title: string) =>
  out.split(`**${title}**`)[1]?.split("**")[0] ?? "";

const zod = {
  name: "zod",
  version: "4.5.4",
  ids: ["GHSA-zod"],
  severity: "8.2",
};
const tmpPkg = { name: "tmp", version: "0.0.33", ids: ["GHSA-tmp"] };

describe("osv-diff", () => {
  it("fails on an advisory the base lacks and lists it as new", () => {
    const run = diff(results([zod, tmpPkg]), results([tmpPkg]));
    expect(run.status).toBe(1);
    expect(section(run.stdout, "New in this pull request")).toContain(
      "| GHSA-zod | zod | 4.5.4 | 8.2 |",
    );
    expect(section(run.stdout, "Already on the base branch")).toContain(
      "| GHSA-tmp | tmp | 0.0.33 | - |",
    );
  });

  it("passes when the advisory is already on base, at any version or alias", () => {
    const run = diff(
      results([
        { ...zod, version: "4.5.5" },
        { ...tmpPkg, ids: ["GHSA-tmp-2"], aliases: ["CVE-tmp"] },
      ]),
      results([zod, { ...tmpPkg, aliases: ["CVE-tmp"] }]),
    );
    expect(run.status).toBe(0);
    expect(section(run.stdout, "New in this pull request")).toContain("None.");
  });

  it("counts the same advisory on another package as new", () => {
    const run = diff(results([{ ...zod, name: "zod-mini" }]), results([zod]));
    expect(run.status).toBe(1);
    expect(section(run.stdout, "New in this pull request")).toContain(
      "| zod-mini |",
    );
  });

  it("reports without failing when there is no base", () => {
    const run = diff(results([zod]));
    expect(run.status).toBe(0);
    expect(section(run.stdout, "On this branch")).toContain("| GHSA-zod |");
    expect(run.stdout).not.toContain("New in this pull request");
  });

  it("says None. for empty results", () => {
    const run = diff(results([]), results([]));
    expect(run.status).toBe(0);
    expect(section(run.stdout, "Already on the base branch")).toContain(
      "None.",
    );
  });

  it("sorts rows by code unit and drops duplicates", () => {
    const run = diff(
      results([
        tmpPkg,
        { name: "Zed", version: "1.0.0", ids: ["GHSA-b"] },
        tmpPkg,
        { name: "Zed", version: "1.0.0", ids: ["GHSA-a"] },
      ]),
    );
    const rows = section(run.stdout, "On this branch")
      .split("\n")
      .filter((line) => line.startsWith("| GHSA"));
    expect(rows).toEqual([
      "| GHSA-a | Zed | 1.0.0 | - |",
      "| GHSA-b | Zed | 1.0.0 | - |",
      "| GHSA-tmp | tmp | 0.0.33 | - |",
    ]);
  });

  it("fails when the head results are missing", () => {
    expect(diff(path.join(tmp, "none.json")).status).not.toBe(0);
  });
});
