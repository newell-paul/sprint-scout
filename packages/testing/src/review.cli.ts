import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseFindings, tallyMarkdown, type ReviewTally } from "./review";

// tsx review.cli.ts --structured <file with the action's structured_output>
//   --pr <number> --sha <commit> --run <run id> --model <model>
//   [--out reports/review] [--at <ISO time>]
// Writes tally.json and summary.md. Exits 1 when the structured output is
// missing or malformed, so an unreadable review is a visible failure rather
// than a silent zero on the dashboard.
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const required = (name: string) => {
  const value = option(name);
  if (!value) {
    console.error(`${name} is required`);
    process.exit(1);
  }
  return value;
};

const out = option("--out") ?? "reports/review";
const structured = required("--structured");
let text: string;
try {
  text = readFileSync(structured, "utf8");
} catch {
  console.error(`cannot read ${structured}`);
  process.exit(1);
}
let review: ReturnType<typeof parseFindings>;
try {
  review = parseFindings(text);
} catch (error) {
  console.error(`review tally: ${(error as Error).message}`);
  process.exit(1);
}
const tally: ReviewTally = {
  ...review,
  pr: Number.parseInt(required("--pr"), 10),
  sha: required("--sha"),
  run: Number.parseInt(option("--run") ?? "0", 10),
  model: option("--model") ?? "unknown",
  at: option("--at") ?? new Date().toISOString(),
};
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "tally.json"), JSON.stringify(tally, null, 2) + "\n");
writeFileSync(join(out, "summary.md"), tallyMarkdown(tally));
console.log(
  `Review tally for #${tally.pr} written to ${resolve(out)} (${tally.findings.blocker} blocker, ${tally.findings.major} major, ${tally.findings.minor} minor, ${tally.findings.nit} nit)`,
);
