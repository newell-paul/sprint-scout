// PostToolUse: format the edited file and nudge once per session when source
// changes without a plan update.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const file = path
  .relative(root, path.resolve(root, String(input.tool_input?.file_path ?? "")))
  .split(path.sep)
  .join("/");
if (!file || file.startsWith("..")) process.exit(0);

const formatted = [
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  ".json",
  ".md",
  ".css",
  ".yml",
  ".yaml",
];
if (
  formatted.includes(path.extname(file)) &&
  existsSync(path.join(root, file))
) {
  try {
    execFileSync(
      "pnpm",
      ["exec", "prettier", "--write", "--log-level", "silent", file],
      {
        cwd: root,
        stdio: "ignore",
        timeout: 15_000,
      },
    );
  } catch {
    /* Not formattable or ignored: lint reports it later. */
  }
}

const session = String(input.session_id ?? "nosession").replace(/[^\w-]/g, "");
const state = path.join(root, ".claude", "state");
mkdirSync(state, { recursive: true });
const planTouched = path.join(state, `plan-${session}`);
const nudged = path.join(state, `nudged-${session}`);
if (/^intent\/[^/]+\/plan\.md$/.test(file)) writeFileSync(planTouched, "");
else if (
  /^(apps|packages)\//.test(file) &&
  !existsSync(planTouched) &&
  !existsSync(nudged)
) {
  writeFileSync(nudged, "");
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          "Source changed but no intent/*/plan.md was updated this session. If this work has a plan, update it in the same commit; a small fix can carry on.",
      },
    }),
  );
}
