#!/usr/bin/env node
// Collects the review tallies for the dashboard (docs/sdlc.md, step 11).
//
//   node scripts/collect-reviews.mjs [--out reports/review/reviews.json] [--limit 30]
//
// Lists the latest `review-report` artifacts of the Review workflow, reads
// each tally.json, keeps the latest per pull request, then counts that pull
// request's review threads and how many are resolved. Needs `gh` logged in
// and GITHUB_REPOSITORY (set in Actions). An unreadable artifact is skipped;
// a failed listing or thread count exits 1 and writes nothing, so the cards
// read n/a rather than zeros.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const out = option("--out", "reports/review/reviews.json");
const limit = Number.parseInt(option("--limit", "30"), 10);
const repo = process.env.GITHUB_REPOSITORY ?? process.env.GH_REPO ?? "";
// Logins the reviewer posts under: the Claude GitHub App, or the job token.
const reviewers = new Set([
  "claude",
  "claude[bot]",
  "github-actions",
  "github-actions[bot]",
]);

const gh = (ghArgs, options = {}) =>
  execFileSync("gh", ghArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

function listArtifacts() {
  const text = gh([
    "api",
    `repos/${repo}/actions/artifacts?name=review-report&per_page=${limit}`,
    "--jq",
    // A fork's pull request can upload an artifact of the same name.
    ".artifacts[] | select((.expired | not) and .workflow_run.head_repository_id == .workflow_run.repository_id) | {id, created_at}",
  ]);
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readTally(artifact, dir) {
  const zip = path.join(dir, `${artifact.id}.zip`);
  const bytes = gh(
    ["api", `repos/${repo}/actions/artifacts/${artifact.id}/zip`],
    {
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  writeFileSync(zip, bytes);
  const text = execFileSync("unzip", ["-p", zip, "tally.json"], {
    encoding: "utf8",
  });
  const tally = JSON.parse(text);
  const counts = ["blocker", "major", "minor", "nit"].map(
    (s) => tally.findings?.[s],
  );
  if (
    !Number.isInteger(tally.pr) ||
    !counts.every((n) => Number.isInteger(n) && n >= 0)
  )
    throw new Error("tally.json has no pull request or bad counts");
  return tally;
}

function threads(pr) {
  const [owner, name] = repo.split("/");
  const query =
    "query($owner:String!,$name:String!,$pr:Int!){repository(owner:$owner,name:$name){pullRequest(number:$pr){reviewThreads(first:100){nodes{isResolved comments(first:1){nodes{author{login}}}}}}}}";
  const text = gh([
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-F",
    `owner=${owner}`,
    "-F",
    `name=${name}`,
    "-F",
    `pr=${pr}`,
  ]);
  const nodes =
    JSON.parse(text).data.repository.pullRequest.reviewThreads.nodes;
  const mine = nodes.filter((t) =>
    reviewers.has(t.comments.nodes[0]?.author?.login ?? ""),
  );
  return {
    threads: mine.length,
    resolved: mine.filter((t) => t.isResolved).length,
  };
}

const fail = (message) => {
  console.error(`collect-reviews: ${message}`);
  process.exit(1);
};
const records = new Map();
if (!repo) {
  console.error(
    "collect-reviews: GITHUB_REPOSITORY is not set; writing an empty list",
  );
} else {
  const dir = mkdtempSync(path.join(os.tmpdir(), "review-artifacts-"));
  let artifacts;
  try {
    artifacts = listArtifacts();
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    fail(`cannot list artifacts: ${error.message}`);
  }
  try {
    for (const artifact of artifacts) {
      try {
        const tally = readTally(artifact, dir);
        const seen = records.get(tally.pr);
        if (!seen || tally.at > seen.at) records.set(tally.pr, tally);
      } catch (error) {
        console.error(
          `collect-reviews: artifact ${artifact.id} skipped: ${error.message}`,
        );
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const record of records.values()) {
    try {
      Object.assign(record, threads(record.pr));
    } catch (error) {
      fail(`threads of #${record.pr} unavailable: ${error.message}`);
    }
  }
}

const list = [...records.values()].sort((a, b) => a.pr - b.pr);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(list, null, 2) + "\n");
console.log(
  `collect-reviews: ${list.length} reviewed pull requests written to ${out}`,
);
