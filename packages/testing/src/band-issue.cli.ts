import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import {
  bandPrompt,
  breaches,
  issueBody,
  issueTitle,
  label,
  lastInBandSha,
  matchingIssue,
  stripFence,
  validateIntent,
  type BreachContext,
  type Commit,
} from "./band-issue";
import type { BandResult, BandsFile } from "./bands";
import type { Snapshot } from "./dashboard";

// tsx band-issue.cli.ts --dashboard <dir> --repo <owner/name> --sha <sha>
//   --run-url <url> [--bands packages/testing/bands.yaml]
//   [--model claude-sonnet-5-5] [--max-turns 20] [--out reports/band-issue]
//   [--no-post] [--no-agent]
// Reads bands.json and history.json from the dashboard artifact, lists the
// commits since the last run inside the band, asks the model for a drafted
// intent with read-only tools, and opens or updates one band-breach issue.
// Exits 1 when the model gave no usable intent, after posting the numbers,
// so the gap is visible on the run.
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const flag = (name: string) => args.includes(name);
const dashboard = option("--dashboard") ?? "reports/dashboard";
const repo = option("--repo") ?? process.env["GITHUB_REPOSITORY"] ?? "";
const sha = option("--sha") ?? process.env["GITHUB_SHA"] ?? "";
const runUrl = option("--run-url") ?? "";
const out = option("--out") ?? "reports/band-issue";
const model = option("--model") ?? "claude-sonnet-5-5";
const maxTurns = option("--max-turns") ?? "20";
if (!repo || !sha) {
  console.error("--repo and --sha are required");
  process.exit(1);
}

function run(cmd: string, cmdArgs: string[], input?: string) {
  const r = spawnSync(cmd, cmdArgs, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
  if (r.status !== 0)
    throw new Error(r.stderr.trim() || `${cmd} ${cmdArgs[0]} failed`);
  return r.stdout;
}
const readJson = <T>(path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const configs = (
  parse(
    readFileSync(option("--bands") ?? "packages/testing/bands.yaml", "utf8"),
  ) as BandsFile
).bands;
const found = breaches(
  readJson<BandResult[]>(join(dashboard, "bands.json")),
  configs,
);
mkdirSync(out, { recursive: true });
if (!found.length) {
  writeFileSync(
    join(out, "summary.md"),
    "## Band issue\n\nNo band left its 3σ band; no issue.\n",
  );
  console.log("band-issue: no 3σ breach");
  process.exit(0);
}

const history = readJson<Snapshot[]>(join(dashboard, "history.json"));
const since = lastInBandSha(history, found);
let commits: Commit[] = [];
try {
  commits = run("git", [
    "log",
    "--format=%H%x09%s",
    "-n",
    "50",
    since ? `${since}..${sha}` : sha,
  ])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash = "", ...subject] = line.split("\t");
      return { sha: hash, subject: subject.join("\t") };
    });
} catch (error) {
  console.error(`band-issue: no commit range (${(error as Error).message})`);
}
const ctx: BreachContext = {
  repo,
  runUrl,
  sha,
  since,
  breaches: found,
  commits,
};

const skill = readFileSync(".claude/skills/intent/SKILL.md", "utf8");
const template =
  /^## 1\. intent\.md\s*$([\s\S]*?)^## 2\./m.exec(skill)?.[1]?.trim() ?? skill;
const prompt = bandPrompt(ctx, template);
writeFileSync(join(out, "prompt.md"), prompt);

let intent: string | null = null;
let errors: string[] = ["model not run"];
let meta = { costUsd: 0, turns: 0 };
if (!flag("--no-agent")) {
  const env = { ...process.env };
  delete env["CLAUDECODE"];
  const r = spawnSync(
    "claude",
    [
      "-p",
      prompt,
      "--model",
      model,
      "--max-turns",
      maxTurns,
      "--output-format",
      "json",
      "--allowedTools",
      "Read,Glob,Grep",
    ],
    { encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024 },
  );
  let result: { result?: string; total_cost_usd?: number; num_turns?: number } =
    {};
  try {
    result = JSON.parse(r.stdout) as typeof result;
  } catch {
    result = { result: r.stdout };
  }
  writeFileSync(
    join(out, "result.json"),
    JSON.stringify(
      { status: r.status, ...result, stderr: r.stderr.slice(-2000) },
      null,
      2,
    ) + "\n",
  );
  const answer = stripFence(String(result.result ?? ""));
  errors = validateIntent(answer);
  if (!errors.length) intent = answer;
  meta = {
    costUsd: Number(result.total_cost_usd ?? 0),
    turns: Number(result.num_turns ?? 0),
  };
}

const title = issueTitle(found);
const body = issueBody(ctx, intent);
writeFileSync(join(out, "issue.md"), body);

let posted = "not posted";
if (!flag("--no-post")) {
  run("gh", [
    "label",
    "create",
    label,
    "--repo",
    repo,
    "--color",
    "B60205",
    "--description",
    "A dashboard metric left its 3σ band",
    "--force",
  ]);
  const open = JSON.parse(
    run("gh", [
      "issue",
      "list",
      "--repo",
      repo,
      "--label",
      label,
      "--state",
      "open",
      "--json",
      "number,body",
      "--limit",
      "50",
    ]),
  ) as { number: number; body: string }[];
  const existing = matchingIssue(open, found);
  if (existing) {
    run(
      "gh",
      [
        "issue",
        "edit",
        String(existing),
        "--repo",
        repo,
        "--title",
        title,
        "--body-file",
        "-",
      ],
      body,
    );
    posted = `updated #${existing}`;
  } else {
    posted = run(
      "gh",
      [
        "issue",
        "create",
        "--repo",
        repo,
        "--label",
        label,
        "--title",
        title,
        "--body-file",
        "-",
      ],
      body,
    ).trim();
  }
}

writeFileSync(
  join(out, "summary.md"),
  [
    "## Band issue",
    "",
    `${title}; commits ${since ? `${since.slice(0, 7)}..${sha.slice(0, 7)}` : `up to ${sha.slice(0, 7)}`} (${commits.length}).`,
    "",
    intent ? "Intent drafted." : `No usable intent: ${errors.join("; ")}.`,
    "",
    `${model}, ${meta.turns} turns, $${meta.costUsd.toFixed(3)}; issue ${posted}.`,
    "",
  ].join("\n"),
);
console.log(
  `band-issue: ${intent ? "drafted" : "no usable intent"}; issue ${posted}; reports in ${resolve(out)}`,
);
if (!intent) process.exit(1);
