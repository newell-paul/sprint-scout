import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { intentStatus } from "./dashboard";
import { releaseNotes } from "./release";

// tsx release-notes.cli.ts [--tag v0.9.0] [--previous v0.8.0] [--repo owner/name]
//   [--out notes.md]
// Lists the intents marked done since the previous v* tag. The tag defaults to
// v<root package.json version>; the previous tag to the newest other v* tag.
// Prints to stdout without --out.
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.lastIndexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const git = (...gitArgs: string[]) =>
  execFileSync("git", gitArgs, { encoding: "utf8" }).trim();

const version = (
  JSON.parse(readFileSync("package.json", "utf8")) as { version?: string }
).version;
const tag = option("--tag") ?? `v${version}`;
const previousTag =
  option("--previous") ??
  git("tag", "--list", "v*", "--sort=-v:refname")
    .split("\n")
    .find((t) => t && t !== tag);

const intents = readdirSync("intent", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    slug: entry.name,
    file: join("intent", entry.name, "intent.md"),
  }))
  .filter(({ file }) => existsSync(file))
  .map(({ slug, file }) => ({ slug, text: readFileSync(file, "utf8") }));

function statusesAt(ref: string) {
  const statuses: Record<string, string> = {};
  const files = git("ls-tree", "-r", "--name-only", ref, "--", "intent")
    .split("\n")
    .filter((f) => /^intent\/[^/]+\/intent\.md$/.test(f));
  for (const file of files)
    statuses[file.split("/")[1]!] = intentStatus(git("show", `${ref}:${file}`));
  return statuses;
}

const notes = releaseNotes({
  repo:
    option("--repo") ??
    process.env.GITHUB_REPOSITORY ??
    "newell-paul/sprint-scout",
  tag,
  intents,
  previous: previousTag
    ? { tag: previousTag, statuses: statusesAt(previousTag) }
    : null,
});
const out = option("--out");
if (out) writeFileSync(out, notes);
else process.stdout.write(notes);
