import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  branchFor,
  validSlug,
  pullRequestBody,
  selectCandidates,
  specPrompt,
  specTitle,
  unresolvedQuestions,
  validateSpec,
  type IntentFile,
} from "./spec-draft";

// tsx spec-draft.cli.ts select --changed <file> [--out reports/spec-draft] [--no-gh]
//   Picks the accepted intent to draft from the changed intent.md paths (one
//   per line), writes the prompt and the summary, and sets `slug` and
//   `prompt` in GITHUB_OUTPUT when a draft is due.
// tsx spec-draft.cli.ts open
//   Run by the model inside claude-code-action. Validates
//   intent/$SPEC_SLUG/spec.md, commits it alone on spec/<slug>, pushes and
//   opens the pull request with the action's token. The slug comes from the
//   job environment, never from arguments. Exits 1 with the errors on an
//   invalid draft, so the model can fix the file and run it again.
const [command, ...args] = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const flag = (name: string) => args.includes(name);

function run(cmd: string, cmdArgs: string[]) {
  const r = spawnSync(cmd, cmdArgs, { encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(r.stderr.trim() || `${cmd} ${cmdArgs[0]} failed`);
  return r.stdout.trim();
}

function specTemplate() {
  const skill = readFileSync(".claude/skills/intent/SKILL.md", "utf8");
  return (
    /^## 2\. spec\.md\s*$([\s\S]*?)^## 3\./m.exec(skill)?.[1]?.trim() ?? skill
  );
}

function select() {
  const out = option("--out") ?? "reports/spec-draft";
  const changed = option("--changed");
  if (!changed) throw new Error("--changed is required");
  const intents: IntentFile[] = readFileSync(changed, "utf8")
    .split("\n")
    .map((line) => /^intent\/([^/]+)\/intent\.md$/.exec(line.trim())?.[1])
    .filter((slug): slug is string => Boolean(slug))
    .filter((slug) => existsSync(join("intent", slug, "intent.md")))
    .map((slug) => ({
      slug,
      text: readFileSync(join("intent", slug, "intent.md"), "utf8"),
      hasSpec: existsSync(join("intent", slug, "spec.md")),
    }));
  const openBranches = flag("--no-gh")
    ? []
    : run("gh", [
        "pr",
        "list",
        "--state",
        "open",
        "--json",
        "headRefName",
        "--jq",
        ".[].headRefName",
      ])
        .split("\n")
        .filter(Boolean);
  const selection = selectCandidates(intents, openBranches);

  mkdirSync(out, { recursive: true });
  const summary = [
    "## Spec drafts",
    "",
    selection.slug
      ? `Drafting \`intent/${selection.slug}/spec.md\`.`
      : "No accepted intent without a spec in this push; nothing to draft.",
    ...selection.waiting.map(
      (slug) => `- \`${slug}\` waits for the next push that touches it.`,
    ),
    ...selection.skipped.map((s) => `- \`${s.slug}\` skipped: ${s.reason}.`),
    "",
  ].join("\n");
  writeFileSync(join(out, "summary.md"), summary);
  console.log(summary);
  if (!selection.slug) return;

  const prompt = specPrompt(
    selection.slug,
    readFileSync(join("intent", selection.slug, "intent.md"), "utf8"),
    specTemplate(),
  );
  writeFileSync(join(out, "prompt.md"), prompt);
  const output = process.env["GITHUB_OUTPUT"];
  if (output) {
    const delimiter = `PROMPT_${Date.now()}`;
    appendFileSync(
      output,
      `slug=${selection.slug}\nprompt<<${delimiter}\n${prompt}\n${delimiter}\n`,
    );
  }
}

function open() {
  const slug = process.env["SPEC_SLUG"] ?? "";
  if (!validSlug(slug))
    throw new Error("SPEC_SLUG is missing or not a folder name");
  const file = join("intent", slug, "spec.md");
  if (!existsSync(file)) {
    console.error(`${file} does not exist yet; write it, then run this again.`);
    process.exit(1);
  }
  const text = readFileSync(file, "utf8");
  const errors = validateSpec(text);
  if (errors.length) {
    console.error(
      `${file} is not ready:\n${errors.map((e) => `- ${e}`).join("\n")}`,
    );
    process.exit(1);
  }

  const branch = branchFor(slug);
  const existing = run("gh", [
    "pr",
    "list",
    "--head",
    branch,
    "--state",
    "open",
    "--json",
    "url",
    "--jq",
    ".[0].url",
  ]);
  if (existing) {
    console.log(`A pull request is already open: ${existing}`);
    return;
  }
  const unresolved = unresolvedQuestions(text);
  const title = specTitle(text);
  const runUrl = `${process.env["GITHUB_SERVER_URL"]}/${process.env["GITHUB_REPOSITORY"]}/actions/runs/${process.env["GITHUB_RUN_ID"]}`;
  run("gh", ["auth", "setup-git"]);
  run("git", ["switch", "-c", branch]);
  run("git", ["add", "--", file]);
  run("git", [
    "-c",
    "user.name=claude[bot]",
    "-c",
    "user.email=209825114+claude[bot]@users.noreply.github.com",
    "commit",
    "-m",
    `Spec draft: ${title}`,
  ]);
  run("git", ["push", "origin", branch]);
  const url = run("gh", [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    branch,
    "--title",
    `Spec: ${title}`,
    "--body",
    pullRequestBody(slug, unresolved, runUrl),
    ...(unresolved.length ? ["--draft"] : []),
  ]);
  console.log(
    `Opened ${url}${unresolved.length ? ` as a draft with ${unresolved.length} unresolved questions` : ""}.`,
  );
}

if (command === "select") select();
else if (command === "open") open();
else {
  console.error("usage: spec-draft.cli.ts select --changed <file> | open");
  process.exit(1);
}
