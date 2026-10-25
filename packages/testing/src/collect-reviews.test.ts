// Runs scripts/collect-reviews.mjs against stub `gh` and `unzip` commands, so
// the dashboard's review cards are tested on behaviour, not on source text.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/collect-reviews.mjs",
);
const bin = mkdtempSync(path.join(os.tmpdir(), "collect-reviews-bin-"));
afterAll(() => rmSync(bin, { recursive: true, force: true }));

writeFileSync(
  path.join(bin, "gh"),
  `#!/usr/bin/env node
const [, endpoint] = process.argv.slice(2);
const fail = process.env.FAKE_FAIL;
if (endpoint.includes("artifacts?")) {
  if (fail === "list") process.exit(1);
  for (const id of Object.keys(JSON.parse(process.env.FAKE_TALLIES)))
    console.log(JSON.stringify({ id: Number(id), created_at: "2026-10-25T00:00:00Z" }));
} else if (endpoint.endsWith("/zip")) {
  process.stdout.write("zip");
} else if (endpoint === "graphql") {
  if (fail === "threads") process.exit(1);
  const thread = (isResolved) => ({ isResolved, comments: { nodes: [{ author: { login: "claude[bot]" } }] } });
  console.log(JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { nodes: [thread(true), thread(false)] } } } } }));
}
`,
);
writeFileSync(
  path.join(bin, "unzip"),
  `#!/usr/bin/env node
const id = require("node:path").basename(process.argv[3], ".zip");
process.stdout.write(JSON.stringify(JSON.parse(process.env.FAKE_TALLIES)[id]));
`,
);
chmodSync(path.join(bin, "gh"), 0o755);
chmodSync(path.join(bin, "unzip"), 0o755);

const tally = (pr: number, findings: Record<string, unknown>) => ({
  pr,
  at: "2026-10-25T00:00:00Z",
  findings: { blocker: 0, major: 0, minor: 0, nit: 0, ...findings },
});

function collect(tallies: Record<number, unknown>, fail = "") {
  const dir = mkdtempSync(path.join(os.tmpdir(), "collect-reviews-out-"));
  const out = path.join(dir, "reviews.json");
  const result = spawnSync("node", [script, "--out", out], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      GITHUB_REPOSITORY: "owner/repo",
      FAKE_TALLIES: JSON.stringify(tallies),
      FAKE_FAIL: fail,
    },
  });
  const written = existsSync(out)
    ? (JSON.parse(readFileSync(out, "utf8")) as unknown[])
    : null;
  rmSync(dir, { recursive: true, force: true });
  return { status: result.status, written };
}

describe("review tally collector", () => {
  it("keeps valid tallies with their thread counts and skips malformed ones", () => {
    const { status, written } = collect({
      1: tally(10, { minor: 2 }),
      2: tally(11, { minor: -1 }),
      3: tally(12, { nit: 1.5 }),
    });
    expect(status).toBe(0);
    expect(written).toEqual([
      { ...tally(10, { minor: 2 }), threads: 2, resolved: 1 },
    ]);
  });
  // A partial list would read as a quiet week on the dashboard.
  it("writes nothing when the artifacts cannot be listed", () => {
    expect(collect({ 1: tally(10, {}) }, "list")).toEqual({
      status: 1,
      written: null,
    });
  });
  it("writes nothing when a pull request's threads cannot be read", () => {
    expect(collect({ 1: tally(10, {}) }, "threads")).toEqual({
      status: 1,
      written: null,
    });
  });
});
