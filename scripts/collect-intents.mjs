#!/usr/bin/env node
// Collects intents on open pull request branches for the dashboard's intent
// board (intent/intent-board/spec.md).
//
//   node scripts/collect-intents.mjs [--out reports/github/open-intents.json] [--limit 50]
//
// Lists open pull requests from branches of this repository, and for each
// intent folder a pull request touches reads intent.md from that branch and
// notes whether spec.md and plan.md exist there. Needs `gh` logged in and
// GITHUB_REPOSITORY (set in Actions). An unreadable intent is skipped; a
// failed listing exits 1 and writes nothing.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const out = option("--out", "reports/github/open-intents.json");
const limit = option("--limit", "50");
const repo = process.env.GITHUB_REPOSITORY ?? process.env.GH_REPO ?? "";

const gh = (ghArgs) =>
  execFileSync("gh", ghArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

function openPulls() {
  return JSON.parse(
    gh([
      "pr",
      "list",
      "--repo",
      repo,
      "--state",
      "open",
      "--limit",
      limit,
      "--json",
      "number,url,isDraft,headRefName,isCrossRepository,files,statusCheckRollup",
    ]),
  );
}

function readIntent(slug, ref) {
  const at = `repos/${repo}/contents/intent/${slug}`;
  const query = `?ref=${encodeURIComponent(ref)}`;
  const names = new Set(
    JSON.parse(gh(["api", at + query])).map((entry) => entry.name),
  );
  if (!names.has("intent.md")) return undefined;
  const text = gh([
    "api",
    `${at}/intent.md${query}`,
    "-H",
    "Accept: application/vnd.github.raw",
  ]);
  return { text, spec: names.has("spec.md"), plan: names.has("plan.md") };
}

const intents = [];
if (!repo) {
  console.error(
    "collect-intents: GITHUB_REPOSITORY is not set; writing an empty list",
  );
} else {
  try {
    for (const pull of openPulls()) {
      // A fork's branch is not in this repository, so its files cannot be read here.
      if (pull.isCrossRepository) continue;
      const slugs = new Set(
        pull.files
          .map((file) => /^intent\/([^/]+)\//.exec(file.path)?.[1])
          .filter(Boolean),
      );
      for (const slug of slugs) {
        try {
          const intent = readIntent(slug, pull.headRefName);
          if (!intent) continue;
          intents.push({
            slug,
            ...intent,
            pr: {
              number: pull.number,
              url: pull.url,
              isDraft: pull.isDraft,
              headRefName: pull.headRefName,
              statusCheckRollup: pull.statusCheckRollup ?? [],
            },
          });
        } catch (error) {
          console.error(
            `collect-intents: skipped ${slug} on #${pull.number}: ${error.message.split("\n")[0]}`,
          );
        }
      }
    }
  } catch (error) {
    // Writing [] would claim that nothing is in flight.
    console.error(
      `collect-intents: could not list pull requests: ${error.message.split("\n")[0]}`,
    );
    process.exit(1);
  }
}

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(intents, null, 2) + "\n");
console.log(`collect-intents: ${intents.length} intents written to ${out}`);
