// Deterministic bands over the dashboard history. Each metric is compared
// with the mean and standard deviation of the previous days in its window;
// the number of standard deviations in the worse direction sets the level:
// 1 logs, 2 annotates the dashboard, 3 fails the dashboard job.
import type { Snapshot } from "./dashboard";

export type BandConfig = {
  id: string;
  label: string;
  path: string;
  worse: "higher" | "lower";
  unit?: string | undefined;
  window?: number | undefined;
  minRuns?: number | undefined;
  minSigma?: number | undefined;
  since?: string | undefined;
};
export type BandsFile = { bands: BandConfig[] };
export type BandResult = {
  id: string;
  label: string;
  unit: string;
  value: number | null;
  mean: number | null;
  sigma: number | null;
  z: number | null;
  runs: number;
  level: 0 | 1 | 2 | 3;
  reason: string;
};

function view(s: Snapshot) {
  return {
    ...s,
    evals: s.evals
      ? {
          ...s.evals,
          rate: s.evals.total ? (s.evals.passed / s.evals.total) * 100 : null,
        }
      : s.evals,
  };
}

export function pick(s: Snapshot, path: string): number | null {
  let current: unknown = view(s);
  for (const key of path.split(".")) {
    if (current === null || current === undefined) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" && Number.isFinite(current)
    ? current
    : null;
}

export function stats(values: number[]) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance =
    n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  return { mean, sigma: Math.sqrt(variance) };
}

export function evaluateBand(
  history: Snapshot[],
  config: BandConfig,
): BandResult {
  const unit = config.unit ?? "";
  const latest = history.at(-1);
  const value = latest ? pick(latest, config.path) : null;
  const window = config.window ?? 20;
  const minRuns = config.minRuns ?? 5;
  const since = config.since ? Date.parse(config.since) : -Infinity;
  const previous = history
    .slice(0, -1)
    .filter((s) => Date.parse(s.date) >= since)
    .map((s) => pick(s, config.path))
    .filter((v): v is number => v !== null)
    .slice(-window);
  const base = {
    id: config.id,
    label: config.label,
    unit,
    value,
    runs: previous.length,
  };
  if (value === null)
    return {
      ...base,
      mean: null,
      sigma: null,
      z: null,
      level: 0,
      reason: "no value in the latest run",
    };
  if (previous.length < minRuns) {
    return {
      ...base,
      mean: previous.length ? stats(previous).mean : null,
      sigma: null,
      z: null,
      level: 0,
      reason: `baseline needs ${minRuns} runs, has ${previous.length}`,
    };
  }
  const { mean, sigma } = stats(previous);
  const spread = Math.max(sigma, config.minSigma ?? 0);
  const delta = config.worse === "higher" ? value - mean : mean - value;
  const z = spread > 0 ? delta / spread : delta > 0 ? Infinity : 0;
  const level = z >= 3 ? 3 : z >= 2 ? 2 : z >= 1 ? 1 : 0;
  const fmt = (v: number) =>
    `${Number.isInteger(v) ? v : v.toFixed(unit === "%" ? 1 : 0)}${unit ? ` ${unit}` : ""}`;
  const direction = config.worse === "higher" ? "above" : "below";
  const reason =
    level === 0
      ? `${fmt(value)} within ${z < 0 ? "the better side of " : ""}the ${previous.length}-run band around ${fmt(mean)}`
      : `${fmt(value)} is ${Number.isFinite(z) ? z.toFixed(1) : "far"} σ ${direction} the ${previous.length}-run mean ${fmt(mean)} (σ ${fmt(spread)})`;
  return { ...base, mean, sigma: spread, z, level, reason };
}

export function evaluateBands(history: Snapshot[], file: BandsFile) {
  return file.bands.map((band) => evaluateBand(history, band));
}

export const worstLevel = (results: BandResult[]) =>
  results.reduce<0 | 1 | 2 | 3>(
    (worst, r) => (r.level > worst ? r.level : worst),
    0,
  );

const short = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function bandsMarkdown(results: BandResult[]) {
  const symbol = ["ok", "1σ", "2σ", "3σ"];
  const lines = [
    "## Bands",
    "",
    "| Metric | Latest | Baseline | Level | Note |",
    "| --- | ---: | ---: | --- | --- |",
    ...results.map(
      (r) =>
        `| ${r.label} | ${r.value === null ? "n/a" : short(r.value)} | ${r.mean === null ? "n/a" : short(r.mean)} | ${symbol[r.level]} | ${r.reason} |`,
    ),
    "",
  ];
  const worst = worstLevel(results);
  lines.push(
    worst === 3
      ? "**A metric left its 3σ band: the dashboard job fails.**"
      : worst === 2
        ? "A metric left its 2σ band; the dashboard is annotated."
        : "Every metric is within its bands.",
    "",
  );
  return lines.join("\n");
}
