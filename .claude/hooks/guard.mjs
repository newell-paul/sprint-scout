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
const baselineReason =
  "Blocked: ARIA and screenshot baselines are regenerated, not hand-edited. Run `pnpm exec playwright test <spec> --update-snapshots` or `pnpm test:visual:update`. To hand-edit deliberately: `mkdir -p .claude/state && touch .claude/state/snapshots`, then remove it.";
const fixingReason =
  "Blocked: a bug fix is in progress (.claude/state/fixing). Make the failing test pass without editing tests or baselines; remove the marker when done.";

if (["Read", "Edit", "Write", "MultiEdit"].includes(tool)) {
  const file = rel(String(args.file_path ?? ""));
  if (isEnv(file))
    block(
      "Blocked: .env files are never read or edited by an agent. Use .env.example.",
    );
  if (tool !== "Read") {
    if (isBaseline(file) && !marker("snapshots")) block(baselineReason);
    if (isTest(file) && marker("fixing")) block(fixingReason);
  }
}

// A shell command naming a protected file is allowed only through commands
// that read it or run the suites; anything else could write it.
const readers = [
  "cat",
  "head",
  "tail",
  "less",
  "grep",
  "rg",
  "wc",
  "ls",
  "diff",
  "git diff",
  "git log",
  "git show",
  "git status",
  "git add",
  "git blame",
  "pnpm test",
  "pnpm exec vitest",
  "pnpm exec playwright",
  "pnpm vitest",
  "pnpm playwright",
  "npx vitest",
  "npx playwright",
];
const redirectTargets = (segment) =>
  [...segment.matchAll(/(?:\d|&)?>>?\s*["']?([^\s;&|"']+)/g)].map((m) => m[1]);

function shellWrites(cmd, isProtected) {
  const pathIn = (w) =>
    isProtected(w.replace(/^["']|["']$/g, "").replace(/^-[^=]*=/, ""));
  // A nested command hides inside a reader's segment, so any substitution
  // next to a protected path counts as a write.
  if (/\$\(|`|[<>]\(/.test(cmd) && cmd.split(/[\s"'`()=]+/).some(pathIn))
    return true;
  for (const segment of cmd.split(/&&|\|\||[;\n|&]/)) {
    if (redirectTargets(segment).some(isProtected)) return true;
    const words = segment.trim().split(/\s+/);
    // An assignment naming the path counts, since `$f` can carry it on.
    const naming = words.filter((w) => pathIn(w.replace(/^\w+=/, "")));
    while (words[0] && /^\w+=/.test(words[0])) words.shift();
    const reads = readers.some(
      (r) => words.slice(0, r.split(" ").length).join(" ") === r,
    );
    // An output option, like `git diff --output x.test.ts`, makes even a
    // reader write the file.
    const writesOutput = words.some((w) => /^(-o|--output)/.test(w));
    if (
      naming.length &&
      (!reads || writesOutput || naming.some((w) => w.startsWith("-")))
    )
      return true;
  }
  return false;
}
const namesTest = (word) => /\.(test|spec)\.tsx?\b/.test(word);
const namesBaseline = (word) => /(^|\/)(__aria__|__screenshots__)\//.test(word);

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
  if (!marker("snapshots") && shellWrites(cmd, namesBaseline))
    block(baselineReason);
  // The runners are trusted readers, except when told to rewrite snapshots.
  // Package scripts reach them under any name, so the flag itself decides,
  // in every segment that is not a git command.
  const updatesSnapshots =
    /\btest:visual:update\b/.test(cmd) ||
    cmd
      .split(/&&|\|\||[;\n|&]/)
      .filter((segment) => !/^\s*git\s/.test(segment))
      .some((segment) =>
        segment
          .trim()
          .split(/\s+/)
          .map((w) => w.replace(/^["']|["']$/g, ""))
          .some((w) => /^(-u|--update(-snapshots)?)(=.*)?$/.test(w)),
      );
  if (
    marker("fixing") &&
    (updatesSnapshots ||
      shellWrites(cmd, (w) => namesTest(w) || namesBaseline(w)))
  )
    block(fixingReason);
}
