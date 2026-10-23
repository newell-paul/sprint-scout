#!/usr/bin/env node
// Runs the agent-configuration evals in evals/<task>/ against a throwaway copy
// of the repository. See evals/README.md.
//
//   node scripts/run-evals.mjs [--dry-run] [--model <id>] [--only a,b] [--force] [--keep]
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evalsDir = path.join(root, "evals");
const reportDir = path.join(root, "reports", "evals");
const config = JSON.parse(readFileSync(path.join(evalsDir, "config.json")));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const dryRun = flag("--dry-run");
const force = flag("--force");
const keep = flag("--keep");
const model = option("--model", config.defaultModel);
const only = option("--only", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const tasks = readdirSync(evalsDir)
  .filter((name) => existsSync(path.join(evalsDir, name, "task.md")))
  .filter((name) => only.length === 0 || only.includes(name))
  .sort();
if (tasks.length === 0) {
  console.error("No eval tasks matched.");
  process.exit(1);
}

const sh = (cmd, cmdArgs, opts = {}) =>
  spawnSync(cmd, cmdArgs, { encoding: "utf8", ...opts });
const must = (cmd, cmdArgs, opts) => {
  const r = sh(cmd, cmdArgs, opts);
  if (r.status !== 0)
    throw new Error(
      `${cmd} ${cmdArgs.join(" ")} failed:\n${r.stderr || r.stdout}`,
    );
  return r.stdout;
};

// Everything that steers an agent, hashed with the model: same inputs, same answer.
function configHash() {
  const files = must("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
  })
    .split("\0")
    .filter(
      (f) =>
        f === "AGENTS.md" ||
        f === "REVIEW.md" ||
        f.startsWith(".claude/") ||
        f.startsWith("evals/") ||
        f.startsWith("intent/README") ||
        f === "scripts/run-evals.mjs" ||
        f === "scripts/eval-skills.mjs",
    )
    .sort();
  const hash = createHash("sha256").update(model);
  for (const f of files) {
    hash
      .update(f)
      .update("\0")
      .update(readFileSync(path.join(root, f)));
  }
  return hash.digest("hex").slice(0, 16);
}

// A clean copy of the tracked tree with its own git history and dependencies,
// so the agent's edits and the checks never touch this working copy.
function makeCopy(task) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `scout-eval-${task}-`));
  const list = must("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
  })
    .split("\0")
    .filter(Boolean);
  for (const f of list) {
    const from = path.join(root, f);
    if (!existsSync(from)) continue;
    const to = path.join(dir, f);
    mkdirSync(path.dirname(to), { recursive: true });
    cpSync(from, to);
  }
  const git = (...a) =>
    must(
      "git",
      ["-c", "user.name=eval", "-c", "user.email=eval@example.com", ...a],
      {
        cwd: dir,
      },
    );
  git("init", "-q", "--initial-branch=work");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  must(
    "pnpm",
    ["install", "--frozen-lockfile", "--prefer-offline", "--silent"],
    {
      cwd: dir,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  return dir;
}

function prepare(task, dir) {
  const taskDir = path.join(evalsDir, task);
  const patch = path.join(taskDir, "plant.patch");
  if (existsSync(patch)) must("git", ["apply", patch], { cwd: dir });
  const setup = path.join(taskDir, "setup.sh");
  if (existsSync(setup))
    must("bash", [setup], {
      cwd: dir,
      env: { ...process.env, EVAL_ROOT: dir },
    });
}

function runScript(task, name, dir, resultFile, transcriptFile) {
  const script = path.join(evalsDir, task, name);
  if (!existsSync(script)) return { status: 0, stdout: "", stderr: "" };
  return sh("bash", [script], {
    cwd: dir,
    env: {
      ...process.env,
      EVAL_ROOT: dir,
      RESULT_FILE: resultFile,
      TRANSCRIPT_FILE: transcriptFile,
    },
  });
}

// The stream-JSON transcript shows which skills loaded; its last line is the
// same result object the plain JSON output gives.
function runAgent(task, dir, transcriptFile) {
  const prompt = readFileSync(path.join(evalsDir, task, "task.md"), "utf8");
  const env = { ...process.env };
  delete env.CLAUDECODE; // allow a nested non-interactive session
  const started = Date.now();
  const r = sh(
    "claude",
    [
      "-p",
      prompt,
      "--model",
      model,
      "--max-turns",
      String(config.maxTurns),
      "--output-format",
      "stream-json",
      "--verbose",
      "--permission-mode",
      "acceptEdits",
      "--allowedTools",
      config.allowedTools,
    ],
    { cwd: dir, env, maxBuffer: 64 * 1024 * 1024 },
  );
  writeFileSync(transcriptFile, r.stdout ?? "");
  // Subagents can add their own result lines; the run's own is the last
  // one outside any tool call.
  const parse = (line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  };
  const out = (r.stdout ?? "")
    .split("\n")
    .map(parse)
    .findLast(
      (event) => event?.type === "result" && !event.parent_tool_use_id,
    ) ?? {
    result: "",
    is_error: true,
  };
  return {
    result: String(out.result ?? ""),
    isError: Boolean(out.is_error) || r.status !== 0,
    costUsd: Number(out.total_cost_usd ?? 0),
    turns: Number(out.num_turns ?? 0),
    durationMs: Number(out.duration_ms ?? Date.now() - started),
    stderr: r.stderr?.slice(-2000) ?? "",
  };
}

function writeReports(results, meta) {
  mkdirSync(reportDir, { recursive: true });
  const passed = results.filter((r) => r.pass).length;
  const rate = results.length ? passed / results.length : 0;
  const cost = results.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  const summary = {
    ...meta,
    passed,
    total: results.length,
    rate,
    costUsd: cost,
    results,
  };
  writeFileSync(
    path.join(reportDir, "results.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  const color =
    rate >= config.passRate ? "brightgreen" : rate >= 0.5 ? "yellow" : "red";
  writeFileSync(
    path.join(reportDir, "badge.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        label: meta.dryRun ? "evals (dry run)" : "evals",
        message: `${passed}/${results.length} pass`,
        color,
      },
      null,
      2,
    ) + "\n",
  );
  const lines = [
    `## Evals${meta.dryRun ? " (dry run)" : ""}`,
    "",
    meta.dryRun
      ? "Each task's check must fail on the planted or naive state before any agent runs."
      : `Model \`${meta.model}\`, pass threshold ${Math.round(config.passRate * 100)} %, total cost $${cost.toFixed(3)}.`,
    "",
    "| Task | Result | Turns | Seconds | Cost | Note |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...results.map(
      (r) =>
        `| ${r.task} | ${r.pass ? "pass" : "FAIL"} | ${r.turns ?? ""} | ${r.durationMs ? (r.durationMs / 1000).toFixed(0) : ""} | ${r.costUsd ? `$${r.costUsd.toFixed(3)}` : ""} | ${r.note ?? ""} |`,
    ),
    "",
    `**${passed}/${results.length} passed** (${Math.round(rate * 100)} %).`,
    "",
  ];
  writeFileSync(path.join(reportDir, "summary.md"), lines.join("\n"));
  return summary;
}

const hash = configHash();
const cacheFile = path.join(reportDir, "cache", `${hash}.json`);
if (!dryRun && !force && only.length === 0 && existsSync(cacheFile)) {
  const cached = JSON.parse(readFileSync(cacheFile, "utf8"));
  const summary = writeReports(cached.results, { ...cached, cached: true });
  console.log(
    `Configuration ${hash} unchanged since ${cached.at}: ${summary.passed}/${summary.total} from cache.`,
  );
  process.exit(summary.rate >= config.passRate ? 0 : 1);
}

const results = [];
for (const task of tasks) {
  process.stdout.write(`${task}: `);
  const dir = makeCopy(task);
  const resultFile = path.join(dir, ".eval-result.txt");
  // Outside the copy, so checks that scan the working tree never see it.
  const transcriptFile = `${dir}.transcript.jsonl`;
  writeFileSync(resultFile, "");
  writeFileSync(transcriptFile, "");
  try {
    prepare(task, dir);
    if (dryRun) {
      runScript(task, "naive.sh", dir, resultFile, transcriptFile);
      const check = runScript(
        task,
        "check.sh",
        dir,
        resultFile,
        transcriptFile,
      );
      const pass = check.status !== 0;
      results.push({
        task,
        pass,
        note: pass
          ? `check fails as expected: ${(check.stdout + check.stderr).trim().split("\n")[0] || `exit ${check.status}`}`
          : "check passed before any agent ran; the task proves nothing",
      });
    } else {
      const agent = runAgent(task, dir, transcriptFile);
      writeFileSync(resultFile, agent.result);
      const check = runScript(
        task,
        "check.sh",
        dir,
        resultFile,
        transcriptFile,
      );
      const pass = check.status === 0;
      results.push({
        task,
        pass,
        turns: agent.turns,
        durationMs: agent.durationMs,
        costUsd: agent.costUsd,
        note: pass
          ? agent.isError
            ? "agent reported an error but the check passed"
            : ""
          : (check.stdout + check.stderr).trim().split("\n")[0] ||
            (agent.isError
              ? agent.stderr.trim().split("\n").pop()
              : "check failed"),
      });
    }
  } catch (error) {
    results.push({
      task,
      pass: false,
      note: String(error.message).split("\n")[0],
    });
  } finally {
    if (keep) console.log(`(kept ${dir} and ${transcriptFile})`);
    else {
      rmSync(dir, { recursive: true, force: true });
      rmSync(transcriptFile, { force: true });
    }
  }
  const last = results.at(-1);
  console.log(
    `${last.pass ? "pass" : "FAIL"}${last.note ? ` (${last.note})` : ""}`,
  );
}

const meta = { at: new Date().toISOString(), model, hash, dryRun };
const summary = writeReports(results, meta);
if (!dryRun && only.length === 0) {
  mkdirSync(path.dirname(cacheFile), { recursive: true });
  writeFileSync(
    cacheFile,
    JSON.stringify({ ...meta, results }, null, 2) + "\n",
  );
}
console.log(
  `\n${summary.passed}/${summary.total} ${dryRun ? "checks can fail" : "passed"}` +
    (dryRun ? "" : `, cost $${summary.costUsd.toFixed(3)}`) +
    `. Reports in reports/evals/.`,
);
process.exit(summary.rate >= config.passRate ? 0 : 1);
