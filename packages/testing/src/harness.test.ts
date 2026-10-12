// Tier 0 of the evals (see evals/README.md): free, deterministic checks that
// the agent configuration in this repository is intact. The guard hook is run
// as a child process exactly as Claude Code runs it; the rest are structure
// checks on skills, agents, intents and eval tasks.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const at = (...parts: string[]) => path.join(root, ...parts);
const read = (...parts: string[]) => readFileSync(at(...parts), "utf8");
const guard = at(".claude/hooks/guard.mjs");

type ToolCall = { tool_name: string; tool_input: Record<string, string> };

function runGuard(call: ToolCall, projectDir = root) {
  const result = spawnSync("node", [guard], {
    input: JSON.stringify(call),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  });
  return { status: result.status, stderr: result.stderr.trim() };
}

const file = (tool: string, file_path: string): ToolCall => ({
  tool_name: tool,
  tool_input: { file_path },
});
const bash = (command: string): ToolCall => ({
  tool_name: "Bash",
  tool_input: { command },
});

function frontmatter(text: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  const fields: Record<string, string> = {};
  for (const line of match?.[1]?.split("\n") ?? []) {
    const i = line.indexOf(":");
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return fields;
}

const folders = (dir: string) =>
  readdirSync(at(dir)).filter((name) => statSync(at(dir, name)).isDirectory());

describe("guard hook", () => {
  const envFile = ".env";
  const blocked = [
    ["reading the env file", file("Read", envFile)],
    ["reading an env variant", file("Read", `${envFile}.local`)],
    ["editing the env file", file("Edit", at(envFile))],
    ["hand-editing an ARIA baseline", file("Edit", "e2e/__aria__/x.aria.yml")],
    ["hand-editing a screenshot", file("Write", "e2e/__screenshots__/a/b.png")],
    ["a shell command that reads the env file", bash(`cat ${envFile}`)],
    ["a shell command that copies the env file", bash(`cp ${envFile} /tmp/x`)],
    ["pushing to main", bash("git push origin main")],
    ["pushing HEAD to main", bash("git push origin HEAD:main")],
    ["force pushing", bash("git push -f origin feature")],
    ["force pushing with lease", bash("git push --force-with-lease")],
    ["dispatching the Pages workflow", bash("gh workflow run pages.yml")],
    ["calling the Pages API", bash("gh api repos/o/r/pages/builds -X POST")],
  ] as const;
  const allowed = [
    ["reading the env example", file("Read", `${envFile}.example`)],
    ["editing source", file("Edit", "apps/web/app/routes/library.ts")],
    [
      "editing a test outside a bug fix",
      file("Edit", "apps/web/app/routes/library.test.ts"),
    ],
    ["reading a baseline", file("Read", "e2e/__aria__/x.aria.yml")],
    [
      "process.env in a script",
      bash('node -e "console.log(process.env.HOME)"'),
    ],
    ["copying the env example", bash(`cp ${envFile}.example /tmp/x`)],
    ["pushing a branch", bash("git push -u origin feature/x")],
    ["listing runs", bash("gh run list --workflow ci.yml")],
    [
      "an unrelated tool",
      { tool_name: "Glob", tool_input: { pattern: "**/*.ts" } },
    ],
  ] as const;

  it.each(blocked)("blocks %s", (_name, call) => {
    const { status, stderr } = runGuard(call);
    expect(status).toBe(2);
    expect(stderr).toMatch(/^Blocked:/);
  });

  it.each(allowed)("allows %s", (_name, call) => {
    expect(runGuard(call)).toEqual({ status: 0, stderr: "" });
  });

  describe("with state markers", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "scout-guard-"));
    mkdirSync(path.join(tmp, ".claude/state"), { recursive: true });
    afterAll(() => rmSync(tmp, { recursive: true, force: true }));

    it("blocks test edits only while a bug fix is in progress", () => {
      const call = file("Edit", "apps/web/app/routes/library.test.ts");
      expect(runGuard(call, tmp).status).toBe(0);
      writeFileSync(path.join(tmp, ".claude/state/fixing"), "");
      expect(runGuard(call, tmp).status).toBe(2);
      expect(
        runGuard(file("Edit", "apps/web/app/routes/library.ts"), tmp).status,
      ).toBe(0);
      rmSync(path.join(tmp, ".claude/state/fixing"));
    });

    it("allows baseline edits only with the snapshots marker", () => {
      const call = file("Edit", "e2e/__aria__/x.aria.yml");
      expect(runGuard(call, tmp).status).toBe(2);
      writeFileSync(path.join(tmp, ".claude/state/snapshots"), "");
      expect(runGuard(call, tmp).status).toBe(0);
    });
  });
});

describe("Claude Code settings", () => {
  const settings = JSON.parse(read(".claude/settings.json")) as {
    permissions: { deny: string[] };
    hooks: Record<string, { matcher: string; hooks: { command: string }[] }[]>;
  };

  it("denies reading and editing env files", () => {
    for (const rule of [
      "Read(./.env)",
      "Read(./.env.*)",
      "Edit(./.env)",
      "Edit(./.env.*)",
    ]) {
      expect(settings.permissions.deny).toContain(rule);
    }
  });

  it("wires both hooks to scripts that exist", () => {
    const commands = Object.values(settings.hooks)
      .flat()
      .flatMap((entry) => entry.hooks.map((hook) => hook.command));
    expect(commands.length).toBeGreaterThanOrEqual(2);
    for (const command of commands) {
      const script = /\$CLAUDE_PROJECT_DIR\/(\S+?)"/.exec(command)?.[1];
      expect(script).toBeDefined();
      expect(existsSync(at(script!))).toBe(true);
    }
    expect(settings.hooks.PreToolUse?.[0]?.matcher).toContain("Bash");
  });

  it("keeps state markers out of git", () => {
    expect(read(".gitignore")).toMatch(/^\.claude\/state\/$/m);
  });
});

describe("skills and agents", () => {
  const agentsMd = read("AGENTS.md");

  it.each(folders(".claude/skills"))(
    "skill %s has frontmatter and is named in AGENTS.md",
    (name) => {
      const fields = frontmatter(read(".claude/skills", name, "SKILL.md"));
      expect(fields.name).toBe(name);
      expect(fields.description?.length).toBeGreaterThan(40);
      expect(agentsMd).toContain(`\`${name}\` skill`);
    },
  );

  it.each(readdirSync(at(".claude/agents")))(
    "agent %s has frontmatter and is named in AGENTS.md",
    (fileName) => {
      const fields = frontmatter(read(".claude/agents", fileName));
      expect(fields.name).toBe(fileName.replace(/\.md$/, ""));
      expect(fields.description?.length).toBeGreaterThan(40);
      expect(fields.tools).toBeDefined();
      expect(agentsMd).toContain(`\`${fields.name}\` agent`);
    },
  );
});

describe("intents", () => {
  const required = [
    /^Status: (draft|accepted|in build|done|dropped)$/m,
    /^## Problem$/m,
    /^## Proposed outcome$/m,
    /^## Affected users and parts$/m,
    /^## Constraints$/m,
    /^## Open questions$/m,
  ];

  it.each(folders("intent"))("intent/%s follows the template", (slug) => {
    const intent = read("intent", slug, "intent.md");
    for (const pattern of required) expect(intent).toMatch(pattern);
  });

  const built = folders("intent").filter((slug) =>
    /^Status: (in build|done)$/m.test(read("intent", slug, "intent.md")),
  );

  it.each(built)("intent/%s in build or done has a spec and a plan", (slug) => {
    expect(existsSync(at("intent", slug, "spec.md"))).toBe(true);
    expect(existsSync(at("intent", slug, "plan.md"))).toBe(true);
  });
});

describe("eval tasks", () => {
  const config = JSON.parse(read("evals/config.json")) as Record<
    string,
    unknown
  >;
  const tasks = folders("evals");

  it("has a valid config", () => {
    expect(config.defaultModel).toMatch(/^claude-/);
    expect(config.maxTurns).toBeGreaterThan(0);
    expect(config.passRate).toBeGreaterThan(0);
    expect(config.passRate).toBeLessThanOrEqual(1);
    expect(config.allowedTools).toMatch(/\bRead\b/);
  });

  it("has at least five tasks, each listed in the README", () => {
    expect(tasks.length).toBeGreaterThanOrEqual(5);
    const readme = read("evals/README.md");
    for (const task of tasks) expect(readme).toContain(`\`${task}\``);
  });

  it.each(tasks)("evals/%s is complete and executable", (task) => {
    const has = (name: string) => existsSync(at("evals", task, name));
    expect(read("evals", task, "task.md").trim().length).toBeGreaterThan(40);
    expect(has("check.sh")).toBe(true);
    expect(has("plant.patch") || has("setup.sh") || has("naive.sh")).toBe(true);
    const scripts = ["check.sh", "setup.sh", "naive.sh"].filter(has);
    for (const script of scripts) {
      const stats = statSync(at("evals", task, script));
      expect(stats.mode & 0o111).not.toBe(0);
      expect(read("evals", task, script)).toMatch(/^#!\/bin\/bash\n/);
    }
  });

  it.each(tasks.filter((task) => existsSync(at("evals", task, "plant.patch"))))(
    "evals/%s plant.patch applies to the current tree",
    (task) => {
      const result = spawnSync(
        "git",
        ["apply", "--check", at("evals", task, "plant.patch")],
        {
          cwd: root,
          encoding: "utf8",
        },
      );
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
    },
  );
});

describe("workflows", () => {
  const workflows = readdirSync(at(".github/workflows")).filter((name) =>
    name.endsWith(".yml"),
  );

  it.each(workflows)(".github/workflows/%s has no schedule", (name) => {
    const doc = parse(read(".github/workflows", name)) as Record<
      string,
      unknown
    >;
    // YAML reads the bare key `on` as the boolean true.
    const triggers = (doc["on"] ?? doc["true"]) as Record<string, unknown>;
    expect(triggers).toBeDefined();
    expect(Object.keys(triggers)).not.toContain("schedule");
  });

  it("gates the paid review and keeps secrets away from forks and bots", () => {
    const review = read(".github/workflows/review.yml");
    expect(review).toContain("vars.REVIEW_ENABLED == 'true'");
    expect(review).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(review).toContain("github.event.pull_request.draft == false");
    expect(review).toContain("github.actor != 'dependabot[bot]'");
    expect(review).toContain("--json-schema");
    expect(review).not.toMatch(/gh pr review/);
    expect(review).toContain("github.event.comment.author_association");
    const evals = read(".github/workflows/evals.yml");
    expect(evals).toContain("vars.EVALS_ENABLED == 'true'");
    expect(evals).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
  });

  // A comment event does not say where the pull request came from, so the fix
  // loop asks the API first; otherwise a collaborator's @claude on a fork pull
  // request would install and run the fork's code with the API key.
  it("runs the @claude fix loop only on pull requests from this repository", () => {
    const doc = parse(read(".github/workflows/review.yml")) as {
      jobs: Record<
        string,
        { needs?: string | string[]; if?: string; steps?: { run?: string }[] }
      >;
    };
    const { fix, "fix-origin": origin } = doc.jobs;
    expect([fix?.needs].flat()).toContain("fix-origin");
    expect(fix?.if).toContain("needs.fix-origin.outputs.same-repo == 'true'");
    const script = origin?.steps?.map((step) => step.run ?? "").join("\n");
    expect(script).toContain("/pulls/");
    expect(script).toContain(".head.repo.full_name");
    expect(script).toContain("GITHUB_REPOSITORY");
  });

  it("triages failed runs read-only, from the default branch, behind its switch", () => {
    const triage = read(".github/workflows/triage.yml");
    expect(triage).toContain("vars.TRIAGE_ENABLED == 'true'");
    expect(triage).toContain("workflow_run:");
    expect(triage).toContain(
      "github.event.workflow_run.event == 'pull_request'",
    );
    // Never check out the pull request head in a workflow_run job.
    expect(triage).not.toMatch(/^\s+ref:/m);
    expect(triage).not.toMatch(/head_branch|head_repository/);
    expect(triage).toMatch(/contents: read/);
    expect(triage).not.toMatch(/contents: write/);
  });
});
