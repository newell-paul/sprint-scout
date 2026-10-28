import { intentStatus } from "./dashboard";

export type ReleaseIntent = { slug: string; text: string };
export type ReleaseInput = {
  repo: string;
  tag: string;
  intents: ReleaseIntent[];
  previous: { tag: string; statuses: Record<string, string> } | null;
};

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function releaseNotes({ repo, tag, intents, previous }: ReleaseInput) {
  const done = intents
    .filter(({ slug, text }) => {
      if (intentStatus(text) !== "done") return false;
      return previous?.statuses[slug] !== "done";
    })
    .sort((a, b) => byCodeUnit(a.slug, b.slug))
    .map(({ slug, text }) => {
      const title = /^# (.+)$/m.exec(text)?.[1]?.trim() || slug;
      return `- [${title}](https://github.com/${repo}/blob/${tag}/intent/${slug}/intent.md)`;
    });
  if (!done.length)
    return previous
      ? `No intents completed since ${previous.tag}.\n`
      : "First tagged release. No intents completed yet.\n";
  const heading = previous
    ? `Intents done since ${previous.tag}:`
    : "First tagged release. Intents done:";
  return [heading, "", ...done, ""].join("\n");
}

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const parts = (version: string) => semver.exec(version)!.slice(1).map(Number);

export function nextVersion(current: string | undefined, requested: string) {
  if (!semver.test(requested))
    throw new Error(`Version must be plain x.y.z, got "${requested}".`);
  if (current && semver.test(current)) {
    const [a, b] = [parts(requested), parts(current)];
    const greater =
      a[0]! !== b[0]!
        ? a[0]! > b[0]!
        : a[1]! !== b[1]!
          ? a[1]! > b[1]!
          : a[2]! > b[2]!;
    if (!greater)
      throw new Error(
        `Version must be greater than ${current}, got ${requested}.`,
      );
  }
  return requested;
}
