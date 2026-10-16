// PreToolUse guardrails. Exit 2 blocks the call and shows the reason to Claude.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const marker = (name) => existsSync(path.join(root, ".claude", "state", name));
const block = (reason) => {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
};
const rel = (file) =>
  path.relative(root, path.resolve(root, file)).split(path.sep).join("/");
const isEnv = (file) => {
  const base = path.basename(file);
  return (
    base === ".env" || (base.startsWith(".env.") && base !== ".env.example")
  );
};
const isBaseline = (file) => /(^|\/)(__aria__|__screenshots__)\//.test(file);
const isTest = (file) =>
  /\.(test|spec)\.(ts|tsx)$/.test(file) || isBaseline(file);

const { tool_name: tool, tool_input: args = {} } = input;

if (["Read", "Edit", "Write", "MultiEdit"].includes(tool)) {
  const file = rel(String(args.file_path ?? ""));
  if (isEnv(file))
    block(
      "Blocked: .env files are never read or edited by an agent. Use .env.example.",
    );
  if (tool !== "Read") {
    if (isBaseline(file) && !marker("snapshots"))
      block(
        "Blocked: ARIA and screenshot baselines are regenerated, not hand-edited. Run `pnpm exec playwright test <spec> --update-snapshots` or `pnpm test:visual:update`. To hand-edit deliberately: `mkdir -p .claude/state && touch .claude/state/snapshots`, then remove it.",
      );
    if (isTest(file) && marker("fixing"))
      block(
        "Blocked: a bug fix is in progress (.claude/state/fixing). Make the failing test pass without editing tests or baselines; remove the marker when done.",
      );
  }
}

if (tool === "Bash") {
  const cmd = String(args.command ?? "");
  if (/(^|[^\w.])\.env\b/.test(cmd.replaceAll(".env.example", "")))
    block(
      "Blocked: commands that touch .env are not allowed. Use .env.example.",
    );
  if (
    /\bgit\s+push\b[^|;&]*(\bmain\b|--force|\s-f\b|--force-with-lease)/.test(
      cmd,
    )
  )
    block(
      "Blocked: agents do not push to main or force-push. Open a pull request and merge it once Checks are green.",
    );
}
