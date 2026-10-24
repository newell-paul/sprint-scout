import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import {
  lighthouseGate,
  manifestEntries,
  type GateConfig,
  type Lhr,
} from "./lighthouse-gate";

// tsx lighthouse.cli.ts [--config lighthouse.json] [--out .lighthouseci]
// Serves the static export, runs Lighthouse on it with the desktop preset and
// applies the deploy gate (intent/lighthouse-direct/spec.md). Exits 1 when the
// gate fails, after writing every report.
const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1]!;
};
const config = JSON.parse(
  readFileSync(option("--config", "lighthouse.json"), "utf8"),
) as GateConfig & {
  url: string;
  runs: number;
};
const out = option("--out", ".lighthouseci");

const server = spawn(
  process.execPath,
  ["scripts/serve-static.mjs", "apps/web/out"],
  {
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "/sprint-scout" },
    stdio: ["ignore", "pipe", "inherit"],
  },
);
await new Promise<void>((resolve, reject) => {
  server.stdout.on("data", (chunk: Buffer) => {
    if (chunk.toString().includes("static export at")) resolve();
  });
  server.on("exit", (code) =>
    reject(new Error(`static server exited with ${code}`)),
  );
});

const chrome = await launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});
const runs: Lhr[] = [];
try {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (let index = 0; index < config.runs; index++) {
    const result = await lighthouse(
      config.url,
      { port: chrome.port, output: ["json", "html"], logLevel: "error" },
      desktopConfig,
    );
    if (!result) throw new Error("Lighthouse returned no result");
    const [json, html] = result.report as string[];
    writeFileSync(`${out}/${index}.report.json`, json!);
    writeFileSync(`${out}/${index}.report.html`, html!);
    runs.push(result.lhr as unknown as Lhr);
  }
} finally {
  chrome.kill();
  server.kill();
}

const entries = manifestEntries(runs, config.url, (index) => `${out}/${index}`);
writeFileSync(`${out}/manifest.json`, JSON.stringify(entries, null, 2) + "\n");
for (const [index, entry] of entries.entries()) {
  const scores = Object.entries(entry.summary)
    .map(([name, score]) => `${name} ${Math.round(score * 100)}`)
    .join(", ");
  console.log(
    `run ${index + 1}${entry.isRepresentativeRun ? " (representative)" : ""}: ${scores}`,
  );
}
const failures = lighthouseGate(runs, config);
if (failures.length) {
  console.error(
    `Lighthouse gate failed:\n${failures.map((f) => `  ${f}`).join("\n")}`,
  );
  process.exit(1);
}
console.log("Lighthouse gate passed.");
