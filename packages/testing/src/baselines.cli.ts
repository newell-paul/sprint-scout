import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { baselineTree } from "./baselines";

// tsx baselines.cli.ts --branch <name> --base <sha>
// Run by the Visual baselines workflow after new screenshots are copied over the
// checkout. Commits the changes under e2e/__screenshots__ to the branch through
// the Git data API, so GitHub signs the commit, and moves the branch without
// force: if the branch moved past --base meanwhile, the update is refused.
// Prints "committed <sha>" or "unchanged".
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.lastIndexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const branch = option("--branch");
const base = option("--base");
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
if (!branch || !base || !repo || !token) {
  console.error(
    "Needs --branch, --base, GITHUB_REPOSITORY and GH_TOKEN or GITHUB_TOKEN.",
  );
  process.exit(2);
}
if (branch === "main") {
  console.error("Refusing to commit baselines to main.");
  process.exit(2);
}

async function api<T>(method: string, path: string, body?: unknown) {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body === undefined ? null : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `${method} ${path}: ${response.status} ${await response.text()}`,
    );
  return (await response.json()) as T;
}

const status = execFileSync(
  "git",
  [
    "status",
    "--porcelain",
    "--untracked-files=all",
    "--",
    "e2e/__screenshots__",
  ],
  { encoding: "utf8" },
).split("\n");
const changes = baselineTree(status);
const summary = process.env.GITHUB_STEP_SUMMARY;
if (changes.length === 0) {
  console.log("unchanged");
  if (summary)
    appendFileSync(
      summary,
      "### Visual baselines\n\nBaselines already match.\n",
    );
  process.exit(0);
}

const parent = await api<{ tree: { sha: string } }>(
  "GET",
  `/git/commits/${base}`,
);
const tree = [];
for (const { path, change } of changes) {
  if (change === "delete") {
    tree.push({ path, mode: "100644", type: "blob", sha: null });
    continue;
  }
  const blob = await api<{ sha: string }>("POST", "/git/blobs", {
    content: readFileSync(path).toString("base64"),
    encoding: "base64",
  });
  tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
}
const created = await api<{ sha: string }>("POST", "/git/trees", {
  base_tree: parent.tree.sha,
  tree,
});
const commit = await api<{ sha: string; html_url: string }>(
  "POST",
  "/git/commits",
  {
    message:
      "Visual baselines: regenerate in the Playwright container\n\nRendered by the Visual baselines workflow on " +
      `${base.slice(0, 7)}.`,
    tree: created.sha,
    parents: [base],
  },
);
await api("PATCH", `/git/refs/heads/${encodeURIComponent(branch)}`, {
  sha: commit.sha,
  force: false,
});
console.log(`committed ${commit.sha}`);
if (summary)
  appendFileSync(
    summary,
    `### Visual baselines\n\nCommitted [${commit.sha.slice(0, 7)}](${commit.html_url}) to \`${branch}\`:\n\n${changes
      .map(
        (c) =>
          `- ${c.change === "delete" ? "deleted" : "updated"} \`${c.path}\``,
      )
      .join("\n")}\n`,
  );
