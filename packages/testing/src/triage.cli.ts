import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  cleanLog,
  commentBody,
  failedJobs,
  marker,
  parseDiagnosis,
  summaryMarkdown,
  triagePrompt,
  type Diagnosis,
  type RunContext,
  type RunJob,
} from "./triage";

// tsx triage.cli.ts --run <id> --repo <owner/name> [--pr <number>]
//   [--model claude-sonnet-5-5] [--max-turns 12] [--out reports/triage]
//   [--from <dir>] [--no-post] [--no-agent]
// Reads a failed Checks run (through gh, or from <dir>/run.json and
// <dir>/logs/<jobId>.log with --from), asks the model for a three-line
// diagnosis with read-only tools, and posts or updates one comment on the
// pull request. Exits 1 when the model gave no usable answer, after posting
// the fallback, so the gap is visible on the run.
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const flag = (name: string) => args.includes(name);
const repo = option("--repo") ?? process.env.GITHUB_REPOSITORY ?? "";
const runId = option("--run") ?? "";
const from = option("--from");
const out = option("--out") ?? "reports/triage";
const model = option("--model") ?? "claude-sonnet-5-5";
const maxTurns = option("--max-turns") ?? "12";
if (!repo || !runId) {
  console.error("--repo and --run are required");
  process.exit(1);
}

type RunView = {
  url: string;
  headSha: string;
  displayTitle: string;
  jobs: RunJob[];
};

function gh(ghArgs: string[], input?: string) {
  const r = spawnSync("gh", ghArgs, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
  if (r.status !== 0)
    throw new Error(r.stderr.trim() || `gh ${ghArgs[0]} failed`);
  return r.stdout;
}

const run: RunView = from
  ? (JSON.parse(readFileSync(join(from, "run.json"), "utf8")) as RunView)
  : (JSON.parse(
      gh([
        "run",
        "view",
        runId,
        "--repo",
        repo,
        "--json",
        "url,headSha,displayTitle,jobs",
      ]),
    ) as RunView);

const ctx: RunContext = {
  repo,
  runUrl: run.url,
  sha: run.headSha,
  title: run.displayTitle,
  failures: failedJobs(run.jobs),
};
mkdirSync(out, { recursive: true });
if (!ctx.failures.length) {
  writeFileSync(
    join(out, "summary.md"),
    "## Triage\n\nNo failed or timed-out job in this run; nothing to diagnose.\n",
  );
  console.log("triage: no failed job");
  process.exit(0);
}

function jobLog(jobId: number) {
  try {
    const text = from
      ? readFileSync(join(from, "logs", `${jobId}.log`), "utf8")
      : gh(["api", `repos/${repo}/actions/jobs/${jobId}/logs`]);
    return cleanLog(text);
  } catch (error) {
    return `(log unavailable: ${(error as Error).message})`;
  }
}
const logs = ctx.failures
  .slice(0, 4)
  .map((f) => ({ job: f.job, text: jobLog(f.jobId) }));
const prompt = triagePrompt(ctx, logs);
writeFileSync(join(out, "prompt.md"), prompt);

let diagnosis: Diagnosis | null = null;
let meta = { model, costUsd: 0, turns: 0, posted: false };
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
  diagnosis = parseDiagnosis(String(result.result ?? ""));
  meta = {
    ...meta,
    costUsd: Number(result.total_cost_usd ?? 0),
    turns: Number(result.num_turns ?? 0),
  };
}

const body = commentBody(diagnosis, ctx);
writeFileSync(join(out, "comment.md"), body);

function pullNumber() {
  const given = option("--pr");
  if (given) return given;
  if (from) return undefined;
  const text = gh([
    "api",
    `repos/${repo}/commits/${run.headSha}/pulls`,
    "--jq",
    ".[0].number",
  ]).trim();
  return text || undefined;
}

if (!flag("--no-post")) {
  const pr = pullNumber();
  if (!pr) {
    console.error(
      "triage: no pull request found for this commit; comment not posted",
    );
  } else {
    const existing = gh([
      "api",
      `repos/${repo}/issues/${pr}/comments`,
      "--paginate",
      "--jq",
      `[.[] | select(.body | startswith("${marker}")) | .id] | first`,
    ]).trim();
    const payload = JSON.stringify({ body });
    if (existing && existing !== "null") {
      gh(
        [
          "api",
          "-X",
          "PATCH",
          `repos/${repo}/issues/comments/${existing}`,
          "--input",
          "-",
        ],
        payload,
      );
    } else {
      gh(
        [
          "api",
          "-X",
          "POST",
          `repos/${repo}/issues/${pr}/comments`,
          "--input",
          "-",
        ],
        payload,
      );
    }
    meta.posted = true;
  }
}

writeFileSync(join(out, "summary.md"), summaryMarkdown(diagnosis, ctx, meta));
console.log(
  `triage: ${diagnosis ? "diagnosed" : "no usable diagnosis"} (${ctx.failures.length} failed jobs, ${meta.turns} turns, $${meta.costUsd.toFixed(3)}); reports in ${resolve(out)}`,
);
if (!diagnosis) process.exit(1);
