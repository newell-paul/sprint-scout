#!/usr/bin/env node
// Prints the OSV job summary from osv-scanner JSON results. With a base, it
// exits 1 when the head has an advisory, for a package, that the base lacks;
// advisories already on the base are reported only. See docs/design.md.
//
//   node scripts/osv-diff.mjs <head.json> [base.json]
import { readFileSync } from "node:fs";

const findings = (file) =>
  JSON.parse(readFileSync(file, "utf8")).results.flatMap((result) =>
    result.packages.flatMap(({ package: pkg, groups }) =>
      groups.map((group) => ({
        name: pkg.name,
        version: pkg.version,
        id: group.ids[0],
        ids: [...group.ids, ...(group.aliases ?? [])],
        severity: group.max_severity || "-",
      })),
    ),
  );

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const rows = (list) => {
  const unique = new Map(
    list.map((f) => [`${f.id}\0${f.name}\0${f.version}`, f]),
  );
  const sorted = [...unique.values()].sort(
    (a, b) =>
      compare(a.name, b.name) ||
      compare(a.version, b.version) ||
      compare(a.id, b.id),
  );
  if (!sorted.length) return "None.\n";
  return (
    [
      "| Advisory | Package | Version | Severity |",
      "| -------- | ------- | ------- | -------- |",
      ...sorted.map(
        (f) => `| ${f.id} | ${f.name} | ${f.version} | ${f.severity} |`,
      ),
    ].join("\n") + "\n"
  );
};
const section = (title, note, list) => `**${title}**${note}\n\n${rows(list)}`;

const [headFile, baseFile] = process.argv.slice(2);
const head = findings(headFile);
let out = "### OSV scan\n\n";
let fresh = [];
if (baseFile) {
  const base = findings(baseFile);
  const known = (f) =>
    base.some(
      (b) => b.name === f.name && b.ids.some((id) => f.ids.includes(id)),
    );
  fresh = head.filter((f) => !known(f));
  out += section("New in this pull request", " (fails the check)", fresh);
  out += "\n";
  out += section(
    "Already on the base branch",
    " (reported only)",
    head.filter(known),
  );
} else {
  out += section("On this branch", "", head);
}
process.stdout.write(out);
process.exitCode = fresh.length ? 1 : 0;
