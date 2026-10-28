// Runs scripts/resolve-thread.mjs against a stub `gh` that logs each call, so
// the dashboard's "Fixed after review" card rests on tested behaviour.
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
  "../../../scripts/resolve-thread.mjs",
);
const bin = mkdtempSync(path.join(os.tmpdir(), "resolve-thread-bin-"));
afterAll(() => rmSync(bin, { recursive: true, force: true }));

// Thread T1 holds comments 11 and 12, T2 holds 21 and is already resolved.
writeFileSync(
  path.join(bin, "gh"),
  `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(args) + "\\n");
const query = args.find((a) => a.startsWith("query=")) ?? "";
if (query.includes("reviewThreads")) {
  const thread = (id, isResolved, ids) => ({
    id,
    isResolved,
    comments: { nodes: ids.map((databaseId) => ({ databaseId })) },
  });
  console.log(JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { nodes: [
    thread("T1", false, [11, 12]),
    thread("T2", true, [21]),
  ] } } } } }));
} else {
  console.log(JSON.stringify({ data: {} }));
}
`,
);
chmodSync(path.join(bin, "gh"), 0o755);

function resolve(...args: string[]) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "resolve-thread-log-"));
  const log = path.join(dir, "calls.log");
  const result = spawnSync("node", [script, "--pr", "87", ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      GITHUB_REPOSITORY: "owner/repo",
      FAKE_LOG: log,
    },
  });
  const calls = existsSync(log)
    ? readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[])
    : [];
  rmSync(dir, { recursive: true, force: true });
  const mutations = calls
    .map((call) => call.find((a) => a.startsWith("query=")) ?? "")
    .filter((query) => query.startsWith("query=mutation"))
    .map(
      (query) =>
        /(addPullRequestReviewThreadReply|resolveReviewThread)/.exec(
          query,
        )?.[1],
    );
  return { status: result.status, calls, mutations };
}

describe("review thread resolver", () => {
  it("replies, then resolves the thread that holds the comment", () => {
    const { status, calls, mutations } = resolve(
      "--comment",
      "12",
      "--reply",
      "Fixed in abc1234.",
    );
    expect(status).toBe(0);
    expect(mutations).toEqual([
      "addPullRequestReviewThreadReply",
      "resolveReviewThread",
    ]);
    const flat = calls.flat();
    expect(flat).toContain("thread=T1");
    expect(flat).toContain("body=Fixed in abc1234.");
  });
  it("resolves without a reply when none is given", () => {
    const { status, mutations } = resolve("--comment", "11");
    expect(status).toBe(0);
    expect(mutations).toEqual(["resolveReviewThread"]);
  });
  it("leaves a resolved thread alone", () => {
    const { status, mutations } = resolve("--comment", "21", "--reply", "x");
    expect(status).toBe(0);
    expect(mutations).toEqual([]);
  });
  it("fails without changing anything when no thread holds the comment", () => {
    const { status, mutations } = resolve("--comment", "99", "--reply", "x");
    expect(status).toBe(1);
    expect(mutations).toEqual([]);
  });
});
