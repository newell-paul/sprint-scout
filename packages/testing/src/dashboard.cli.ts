import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse } from "yaml";
import {
  bandsMarkdown,
  evaluateBands,
  worstLevel,
  type BandsFile,
} from "./bands";
import {
  appendHistory,
  badges,
  intentBoard,
  refreshBoard,
  render,
  snapshot,
  type LighthouseManifest,
  type LighthouseResult,
  type OpenIntent,
  type Snapshot,
} from "./dashboard";

// tsx dashboard.cli.ts --out reports/dashboard [--history previous/history.json]
//   [--playwright reports/e2e/report.json] [--unit reports/unit/report.json]
//   [--component reports/component/report.json]
//   [--coverage coverage/coverage-summary.json] [--mutation reports/mutation/mutation.json]
//   [--type-coverage reports/type-coverage.json] [--lighthouse .lighthouseci]
//   [--size reports/size.json] [--evals reports/evals/results.json]
//   [--runs reports/github/runs.json] [--pulls reports/github/pulls.json]
//   [--intents intent] [--open-intents reports/github/open-intents.json]
//   [--repo owner/name] [--reviews reports/review/reviews.json]
//   [--bands packages/testing/bands.yaml]
//   [--date YYYY-MM-DD] [--sha <commit>]
// tsx dashboard.cli.ts --refresh-board <dashboard dir> [--intents intent]
//   [--open-intents reports/github/open-intents.json] [--repo owner/name]
//   [--date YYYY-MM-DD]
// Every input is optional: a missing file leaves its cards at n/a. With
// --bands, exits 3 when a metric leaves its 3σ band, after writing everything.
const args = process.argv.slice(2);
// The last flag wins, so CI can override a default the pnpm script passes.
const option = (name: string) => {
  const index = args.lastIndexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const readJson = <T>(path: string | undefined): T | undefined =>
  path && existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as T)
    : undefined;

function readLighthouse(dir: string | undefined) {
  if (!dir || !existsSync(join(dir, "manifest.json"))) return undefined;
  const manifest = readJson<LighthouseManifest>(join(dir, "manifest.json"))!;
  const results: Record<string, LighthouseResult> = {};
  for (const run of manifest) {
    // Manifests written on another machine carry absolute paths; the file
    // sits beside the manifest either way.
    const local = join(dir, run.jsonPath.split(/[\\/]/).pop()!);
    const result = readJson<LighthouseResult>(
      existsSync(run.jsonPath) ? run.jsonPath : local,
    );
    if (result) results[run.jsonPath] = result;
  }
  return { manifest, results };
}

function readIntents(dir: string | undefined) {
  if (!dir || !existsSync(dir)) return undefined;
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name, "intent.md"))
    .filter((file) => existsSync(file))
    .map((file) => ({
      slug: dirname(file).split(/[\\/]/).pop()!,
      text: readFileSync(file, "utf8"),
      spec: existsSync(join(dirname(file), "spec.md")),
      plan: existsSync(join(dirname(file), "plan.md")),
    }));
}

// The planner's committed font files and logo, served next to the page so it
// makes no request beyond its own origin.
const fonts = "apps/web/app/fonts";
function copyAssets(dir: string) {
  mkdirSync(join(dir, "fonts"), { recursive: true });
  for (const file of readdirSync(fonts).filter((f) => /\.(woff2|txt)$/.test(f)))
    copyFileSync(join(fonts, file), join(dir, "fonts", file));
  copyFileSync(
    "apps/web/app/components/logo-mark.png",
    join(dir, "logo-mark.png"),
  );
}

const refreshDir = option("--refresh-board");
if (refreshDir) {
  const history = readJson<Snapshot[]>(join(refreshDir, "history.json")) ?? [];
  const repo =
    option("--repo") ??
    process.env.GITHUB_REPOSITORY ??
    history.at(-1)?.repo ??
    "newell-paul/sprint-scout";
  const board = intentBoard(
    readIntents(option("--intents") ?? "intent") ?? [],
    readJson<OpenIntent[]>(option("--open-intents")) ?? [],
    repo,
  );
  const refreshed = refreshBoard(
    history,
    board,
    option("--date") ?? new Date().toISOString().slice(0, 10),
  );
  writeFileSync(
    join(refreshDir, "history.json"),
    JSON.stringify(refreshed, null, 2) + "\n",
  );
  writeFileSync(
    join(refreshDir, "index.html"),
    render(refreshed, readJson(join(refreshDir, "bands.json")) ?? []),
  );
  copyAssets(refreshDir);
  console.log(`Intent board refreshed in ${resolve(refreshDir)}/index.html`);
  process.exit(0);
}

const out = option("--out") ?? "reports/dashboard";
const history = readJson<Snapshot[]>(option("--history")) ?? [];
const next = snapshot({
  date: option("--date") ?? new Date().toISOString().slice(0, 10),
  sha: option("--sha"),
  playwright: readJson(option("--playwright")),
  unit: readJson(option("--unit")),
  component: readJson(option("--component")),
  coverage: readJson(option("--coverage")),
  mutation: readJson(option("--mutation")),
  typeCoverage: readJson(option("--type-coverage")),
  lighthouse: readLighthouse(option("--lighthouse")),
  size: readJson(option("--size")),
  evals: readJson(option("--evals")),
  runs: readJson(option("--runs")),
  pulls: readJson(option("--pulls")),
  intents: readIntents(option("--intents")),
  openIntents: readJson(option("--open-intents")),
  repo: option("--repo") ?? process.env.GITHUB_REPOSITORY,
  reviews: readJson(option("--reviews")),
});
const merged = appendHistory(history, next);
const bandsPath = option("--bands");
const bands =
  bandsPath && existsSync(bandsPath)
    ? evaluateBands(merged, parse(readFileSync(bandsPath, "utf8")) as BandsFile)
    : [];
mkdirSync(join(out, "badges"), { recursive: true });
writeFileSync(
  join(out, "history.json"),
  JSON.stringify(merged, null, 2) + "\n",
);
writeFileSync(join(out, "index.html"), render(merged, bands));
copyAssets(out);
if (bandsPath) {
  writeFileSync(join(out, "bands.json"), JSON.stringify(bands, null, 2) + "\n");
  writeFileSync(join(out, "bands.md"), bandsMarkdown(bands));
}
for (const [name, badge] of Object.entries(badges(merged.at(-1)))) {
  writeFileSync(
    join(out, "badges", `${name}.json`),
    JSON.stringify(badge, null, 2) + "\n",
  );
}
console.log(
  `Dashboard written to ${resolve(out)}/index.html (${merged.length} days)`,
);
for (const band of bands.filter((b) => b.level >= 1)) {
  console.log(`band ${band.level}σ ${band.label}: ${band.reason}`);
}
if (worstLevel(bands) >= 3) {
  console.error("A metric left its 3σ band; see bands.md.");
  process.exit(3);
}
