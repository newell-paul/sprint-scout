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
    ["merging a pull request", bash("gh pr merge 4 --merge --delete-branch")],
    ["dispatching the Pages workflow", bash("gh workflow run pages.yml")],
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

  // The Edit and Write rules alone left a shell route around both markers.
  describe("shell commands under the markers", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "scout-guard-bash-"));
    mkdirSync(path.join(tmp, ".claude/state"), { recursive: true });
    const fixing = path.join(tmp, ".claude/state/fixing");
    const snapshots = path.join(tmp, ".claude/state/snapshots");
    afterAll(() => rmSync(tmp, { recursive: true, force: true }));
    const testFile = "apps/web/app/routes/library.test.ts";

    const testWrites = [
      `sed -i 's/a/b/' ${testFile}`,
      `node -e "require('fs').writeFileSync('x.test.ts','')"`,
      `echo x > ${testFile}`,
      `git checkout -- ${testFile}`,
      `cat ${testFile} | tee ${testFile}`,
      ["cat README.md", `sed -i 's/a/b/' ${testFile}`].join("\n"),
      `cat README.md & sed -i 's/a/b/' ${testFile}`,
      `git diff --output=${testFile}`,
      `git diff --output ${testFile}`,
      `cat $(sed -i 's/a/b/' ${testFile})`,
      `cat \`sed -i 's/a/b/' ${testFile}\``,
      `diff <(sed -i 's/a/b/' ${testFile}) README.md`,
      `f=${testFile}; sed -i 's/a/b/' $f`,
      `pnpm exec vitest run -u ${testFile}`,
      "pnpm exec vitest run --update",
      "pnpm exec playwright test e2e/x.spec.ts --update-snapshots",
      "pnpm test:visual:update",
      "pnpm test -- -u",
      "pnpm test:e2e --update-snapshots",
      `pnpm exec vitest run "-u" ${testFile}`,
      "pnpm test:component --update=true",
      "git -c alias.t='!pnpm test -- -u' t",
      "(pnpm exec vitest run -u)",
      "pnpm exec vitest run -\\u",
    ];
    const testReads = [
      `cat ${testFile}`,
      `pnpm exec vitest run ${testFile}`,
      `pnpm exec vitest run x.test.ts > /tmp/out.txt`,
      `git diff -- x.test.ts`,
      "git add -u",
      "git push -u origin fix/x",
      `grep -on newId ${testFile}`,
    ];
    const baselineWrites = [
      "echo x >> e2e/__aria__/x.aria.yml",
      "cp a.png e2e/__screenshots__/a/b.png",
      "rm -rf e2e/__aria__",
      "git checkout origin/main -- e2e/__aria__",
    ];
    const baselineRuns = [
      "pnpm exec playwright test e2e/x.spec.ts --update-snapshots",
      "git add e2e/__aria__/x.aria.yml",
      "cat e2e/__aria__/x.aria.yml",
    ];

    it.each(testWrites)("blocks `%s` while a bug fix is in progress", (cmd) => {
      writeFileSync(fixing, "");
      const { status, stderr } = runGuard(bash(cmd), tmp);
      rmSync(fixing);
      expect(status).toBe(2);
      expect(stderr).toMatch(/^Blocked:.*fixing/);
    });

    it.each(testReads)("allows `%s` while a bug fix is in progress", (cmd) => {
      writeFileSync(fixing, "");
      const result = runGuard(bash(cmd), tmp);
      rmSync(fixing);
      expect(result).toEqual({ status: 0, stderr: "" });
    });

    it.each(testWrites)("allows `%s` outside a bug fix", (cmd) => {
      expect(runGuard(bash(cmd), tmp)).toEqual({ status: 0, stderr: "" });
    });

    it.each(baselineWrites)(
      "blocks `%s` without the snapshots marker",
      (cmd) => {
        const { status, stderr } = runGuard(bash(cmd), tmp);
        expect(status).toBe(2);
        expect(stderr).toMatch(/^Blocked:.*baselines/);
      },
    );

    it.each(baselineRuns)("allows `%s` without the snapshots marker", (cmd) => {
      expect(runGuard(bash(cmd), tmp)).toEqual({ status: 0, stderr: "" });
    });

    it.each(baselineWrites)("allows `%s` with the snapshots marker", (cmd) => {
      writeFileSync(snapshots, "");
      const result = runGuard(bash(cmd), tmp);
      rmSync(snapshots);
      expect(result).toEqual({ status: 0, stderr: "" });
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

describe("skills loaded in an eval transcript", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "scout-transcript-"));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const skillsIn = (lines: string[]) => {
    const transcript = path.join(tmp, "t.jsonl");
    writeFileSync(transcript, lines.join("\n"));
    const result = spawnSync(
      "node",
      [at("scripts/eval-skills.mjs"), transcript],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    return result.stdout.split("\n").filter(Boolean);
  };
  const call = (name: string, input: Record<string, string>) =>
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "tool_use", name, input }] },
    });

  it("lists each skill once, in the order it loaded", () => {
    expect(
      skillsIn([
        call("Skill", { skill: "intent" }),
        "not json",
        call("Read", { file_path: "AGENTS.md" }),
        call("Skill", { command: "bugfix" }),
        call("Skill", { skill: "intent" }),
      ]),
    ).toEqual(["intent", "bugfix"]);
  });

  it("lists nothing for an empty or missing transcript", () => {
    expect(skillsIn([])).toEqual([]);
    const missing = spawnSync(
      "node",
      [at("scripts/eval-skills.mjs"), path.join(tmp, "none.jsonl")],
      { encoding: "utf8" },
    );
    expect(missing).toMatchObject({ status: 0, stdout: "" });
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

  // `pnpm <script>` prints a "> package@ script" banner first, so its output
  // is not JSON unless the banner is silenced or the binary is run with exec.
  it("writes JSON reports in workflows without the pnpm script banner", () => {
    const redirects = readdirSync(at(".github/workflows"))
      .flatMap((file) => read(".github/workflows", file).split("\n"))
      .filter((line) => /\bpnpm\b.*>\s*\S+\.json/.test(line));
    expect(redirects.length).toBeGreaterThan(0);
    for (const line of redirects)
      expect(line).toMatch(/\bpnpm (--silent|-s|exec) /);
  });

  // Most evals runs are free and upload nothing, and mutation is manual, so
  // "latest successful run" usually has no report; look the artifact up instead.
  const sameRepository =
    /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/g;

  it("feeds the dashboard the newest mutation and evals reports, not the newest run", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).not.toMatch(/latest (mutation|evals)\.yml/);
    expect(ci).toContain("actions/artifacts?name=");
    // Only main in this repository: a branch or fork run could upload a report.
    expect(ci).toContain('.workflow_run.head_branch == "main"');
    expect(ci).toContain(
      ".workflow_run.head_repository_id == .workflow_run.repository_id",
    );
    for (const name of ["mutation-report", "evals-report"])
      expect(ci).toMatch(new RegExp(`newest ${name}\\)`));
  });

  // A fork's pull request from a branch named main also completes Checks with
  // head_branch "main"; only a push in this repository may reach Pages.
  it("deploys only after a push to main in this repository", () => {
    const pages = read(".github/workflows/pages.yml");
    expect(pages).toContain("github.event.workflow_run.event == 'push'");
    expect(pages.match(sameRepository)).toHaveLength(1);
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
    expect(triage).not.toMatch(/head_branch/);
    // A fork's failing run would feed the paid model logs the fork wrote.
    expect(triage.match(sameRepository)).toHaveLength(2);
    expect(triage).toMatch(/contents: read/);
    expect(triage).not.toMatch(/contents: write/);
  });

  // The spec job holds a token that can open pull requests, so it reads main
  // only, and its model's one command is the script that validates the draft.
  it("drafts specs only from accepted intents on main, behind its switch", () => {
    const spec = read(".github/workflows/spec.yml");
    const doc = parse(spec) as {
      on: Record<string, { branches?: string[]; paths?: string[] }>;
      jobs: Record<
        string,
        { if?: string; steps?: { with?: Record<string, string> }[] }
      >;
    };
    expect(Object.keys(doc.on)).toEqual(["push"]);
    expect(doc.on["push"]?.branches).toEqual(["main"]);
    expect(doc.on["push"]?.paths).toEqual(["intent/*/intent.md"]);
    expect(doc.jobs["draft"]?.if).toBe("vars.SPEC_ENABLED == 'true'");
    expect(spec).not.toMatch(/^\s+ref:/m);
    expect(spec).not.toMatch(/contents: write/);
    const action = doc.jobs["draft"]?.steps?.find(
      (s) => s.with?.["claude_args"],
    );
    const tools = /--allowedTools "([^"]+)"/.exec(
      action?.with?.["claude_args"] ?? "",
    )?.[1];
    expect(tools?.split(",")).toEqual([
      "Read",
      "Glob",
      "Grep",
      "Edit(intent/${{ steps.select.outputs.slug }}/spec.md)",
      "Bash(pnpm spec:draft open)",
    ]);
    expect(spec).toContain("persist-credentials: false");
  });

  it("opens band issues only on a main breach, read-only, behind its switch", () => {
    const doc = parse(read(".github/workflows/ci.yml")) as {
      jobs: Record<
        string,
        {
          if?: string;
          needs?: string;
          permissions?: Record<string, string>;
          steps?: { run?: string }[];
        }
      >;
    };
    const job = doc.jobs["band-issue"];
    expect(job?.needs).toBe("dashboard");
    expect(job?.if).toContain("needs.dashboard.outputs.breach == 'true'");
    expect(job?.if).toContain("vars.SPEC_ENABLED == 'true'");
    expect(doc.jobs["dashboard"]?.if).toContain(
      "github.ref == 'refs/heads/main'",
    );
    expect(job?.permissions).toEqual({ contents: "read", issues: "write" });
    expect(JSON.stringify(job?.steps)).toContain('"persist-credentials":false');
    const cli = read("packages/testing/src/band-issue.cli.ts");
    expect(cli).toMatch(/"--allowedTools",\s*"Read,Glob,Grep"/);
  });
});
