// Builds the engineering dashboard on main: one snapshot per day, which a
// later run that day replaces, 90 days kept, rendered as a static page with
// no scripts, plus shields endpoint badges. Every input is optional; a missing report leaves its cards
// at "n/a" and never fails the build.
import {
  reviewSummary,
  severities,
  totalFindings,
  type ReviewRecord,
  type ReviewSummary,
} from "./review";

export type ReportResult = { status: string; duration: number };
export type ReportTest = { projectName: string; results: ReportResult[] };
export type ReportSpec = { title: string; file: string; tests: ReportTest[] };
export type ReportSuite = {
  title: string;
  file: string;
  specs: ReportSpec[];
  suites?: ReportSuite[];
};
export type PlaywrightReport = {
  suites: ReportSuite[];
  stats?: { startTime?: string; duration?: number };
};
export type VitestReport = {
  numTotalTests: number;
  numFailedTests: number;
  startTime?: number;
  testResults: { startTime: number; endTime: number }[];
};
export type CoverageSummary = {
  total: Record<"lines" | "branches" | "statements", { pct: number }>;
};
export type MutationReport = {
  files: Record<string, { mutants: { status: string }[] }>;
};
export type TypeCoverageReport = { percent?: number; percentString?: string };
export type LighthouseManifest = {
  isRepresentativeRun: boolean;
  jsonPath: string;
  summary: Record<string, number>;
}[];
export type LighthouseResult = {
  categories: Record<string, { score: number | null }>;
  audits: Record<string, { numericValue?: number }>;
};
export type SizeLimitReport = {
  name: string;
  size: number;
  sizeLimit?: number;
}[];
export type EvalsReport = {
  at: string;
  model: string;
  passed: number;
  total: number;
  costUsd: number;
};
export type WorkflowRun = {
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  attempt?: number;
};
export type PullRequest = { createdAt: string; mergedAt: string | null };
export type IntentFile = {
  slug: string;
  text: string;
  spec?: boolean;
  plan?: boolean;
};
export type CheckRollupItem = {
  status?: string;
  conclusion?: string | null;
  state?: string;
};
export type OpenIntent = IntentFile & {
  pr: {
    number: number;
    url: string;
    isDraft: boolean;
    headRefName: string;
    statusCheckRollup: CheckRollupItem[];
  };
};
export type CheckState = "passing" | "failing" | "running" | "no checks";
export type BoardColumn =
  "Draft" | "Accepted" | "In build" | "Done" | "Dropped";
export type BoardCard = {
  slug: string;
  title: string;
  opened: string;
  column: BoardColumn;
  spec: boolean;
  plan: boolean;
  folder: string;
  pr?: { number: number; url: string; draft: boolean; checks: CheckState };
};

export type RunResult = "pass" | "rerun" | "fail" | "cancelled";
export type RecentRun = { at: string; result: RunResult; durationMs: number };

export type Counts = { tests: number; failed: number; durationMs: number };
export type Snapshot = {
  date: string;
  sha?: string;
  e2e:
    | (Counts & {
        flaky?: number;
        slowest: { title: string; project: string; durationMs: number }[];
      })
    | null;
  unit?: Counts | null;
  component?: Counts | null;
  coverage: { lines: number; branches: number } | null;
  mutationScore: number | null;
  typeCoverage?: number | null;
  lighthouse?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    lcpMs: number | null;
    tbtMs: number | null;
  } | null;
  bundle?: { name: string; bytes: number; limitBytes: number | null }[] | null;
  evals?: EvalsReport | null;
  pipeline?: {
    durationMs: number | null;
    firstPassRate: number | null;
    recent?: RecentRun[];
  } | null;
  delivery?: {
    medianCycleHours: number | null;
    mergesPerWeek: number[];
  } | null;
  intents?: { slug: string; status: string; opened: string }[] | null;
  board?: BoardCard[] | null;
  boardAt?: string;
  repo?: string;
  review?: ReviewSummary | null;
};
export type Inputs = {
  date: string;
  sha?: string | undefined;
  playwright?: PlaywrightReport | undefined;
  unit?: VitestReport | undefined;
  component?: VitestReport | undefined;
  coverage?: CoverageSummary | undefined;
  mutation?: MutationReport | undefined;
  typeCoverage?: TypeCoverageReport | undefined;
  lighthouse?:
    | {
        manifest: LighthouseManifest;
        results: Record<string, LighthouseResult>;
      }
    | undefined;
  size?: SizeLimitReport | undefined;
  evals?: EvalsReport | undefined;
  runs?: WorkflowRun[] | undefined;
  pulls?: PullRequest[] | undefined;
  intents?: IntentFile[] | undefined;
  openIntents?: OpenIntent[] | undefined;
  repo?: string | undefined;
  reviews?: ReviewRecord[] | undefined;
  now?: string | undefined;
};

const passed = (status: string) => status === "passed" || status === "skipped";

function* specs(suites: ReportSuite[]): Generator<ReportSpec> {
  for (const suite of suites) {
    yield* suite.specs;
    if (suite.suites) yield* specs(suite.suites);
  }
}

export function summarise(report: PlaywrightReport) {
  const tests = [...specs(report.suites)].flatMap((spec) =>
    spec.tests.map((test) => ({
      title: spec.title,
      project: test.projectName,
      failed: !passed(test.results.at(-1)?.status ?? "passed"),
      flaky:
        passed(test.results.at(-1)?.status ?? "passed") &&
        test.results.some((r) => !passed(r.status)),
      durationMs: Math.max(0, ...test.results.map((r) => r.duration)),
    })),
  );
  return {
    tests: tests.length,
    failed: tests.filter((t) => t.failed).length,
    flaky: tests.filter((t) => t.flaky).length,
    durationMs: report.stats?.duration ?? 0,
    slowest: tests
      .map(({ title, project, durationMs }) => ({ title, project, durationMs }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10),
  };
}

export function summariseVitest(report: VitestReport): Counts {
  const start = Math.min(...report.testResults.map((r) => r.startTime));
  const end = Math.max(...report.testResults.map((r) => r.endTime));
  return {
    tests: report.numTotalTests,
    failed: report.numFailedTests,
    durationMs: report.testResults.length ? Math.max(0, end - start) : 0,
  };
}

export function mutationScore(report: MutationReport) {
  const mutants = Object.values(report.files).flatMap((f) => f.mutants);
  const counted = mutants.filter(
    (m) => !["Ignored", "CompileError", "RuntimeError"].includes(m.status),
  );
  const detected = counted.filter((m) =>
    ["Killed", "Timeout"].includes(m.status),
  );
  return counted.length ? (detected.length / counted.length) * 100 : null;
}

export function lighthouseSummary(
  manifest: LighthouseManifest,
  results: Record<string, LighthouseResult>,
): NonNullable<Snapshot["lighthouse"]> | null {
  const run = manifest.find((r) => r.isRepresentativeRun) ?? manifest[0];
  if (!run) return null;
  const result = results[run.jsonPath];
  const score = (name: string) =>
    Math.round(
      (result?.categories[name]?.score ?? run.summary[name] ?? 0) * 100,
    );
  const metric = (name: string) => {
    const value = result?.audits[name]?.numericValue;
    return value === undefined ? null : Math.round(value);
  };
  return {
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    seo: score("seo"),
    lcpMs: metric("largest-contentful-paint"),
    tbtMs: metric("total-blocking-time"),
  };
}

export function pipelineSummary(runs: WorkflowRun[], window = 30) {
  // gh lists the run still in progress, the one building this dashboard, with "".
  const completed = runs.filter((r) => r.conclusion).slice(0, window);
  // A run cancelled by a newer push says nothing about the code or the pipeline.
  const counted = completed.filter((r) => r.conclusion !== "cancelled");
  const latest = counted[0];
  const firstPass = counted.filter(
    (r) => r.conclusion === "success" && (r.attempt ?? 1) === 1,
  ).length;
  return {
    durationMs: latest
      ? Math.max(0, Date.parse(latest.updatedAt) - Date.parse(latest.createdAt))
      : null,
    firstPassRate: counted.length ? (firstPass / counted.length) * 100 : null,
    recent: completed
      .map((r): RecentRun => ({
        at: r.createdAt,
        result: runResult(r),
        durationMs: Math.max(
          0,
          Date.parse(r.updatedAt) - Date.parse(r.createdAt),
        ),
      }))
      .reverse(),
  };
}

function runResult(run: WorkflowRun): RunResult {
  if (run.conclusion === "success")
    return (run.attempt ?? 1) === 1 ? "pass" : "rerun";
  return run.conclusion === "cancelled" ? "cancelled" : "fail";
}

const weekMs = 7 * 24 * 3600 * 1000;

export function deliverySummary(pulls: PullRequest[], now: string, weeks = 8) {
  const merged = pulls.filter(
    (p): p is PullRequest & { mergedAt: string } => p.mergedAt !== null,
  );
  const hours = merged
    .map((p) => (Date.parse(p.mergedAt) - Date.parse(p.createdAt)) / 3_600_000)
    .sort((a, b) => a - b);
  const median = hours.length
    ? hours.length % 2
      ? hours[(hours.length - 1) / 2]!
      : (hours[hours.length / 2 - 1]! + hours[hours.length / 2]!) / 2
    : null;
  const end = Date.parse(now);
  const mergesPerWeek = Array.from({ length: weeks }, (_, i) => {
    const to = end - (weeks - 1 - i) * weekMs;
    const from = to - weekMs;
    return merged.filter((p) => {
      const t = Date.parse(p.mergedAt);
      return t > from && t <= to;
    }).length;
  });
  return { medianCycleHours: median, mergesPerWeek };
}

export const intentStatus = (text: string) =>
  /^Status:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? "unknown";
const intentOpened = (text: string) =>
  /^Opened:\s*(.+?)(?: by .*)?$/m.exec(text)?.[1]?.trim() ?? "";

export function intentSummary(files: IntentFile[]) {
  return files
    .map(({ slug, text }) => ({
      slug,
      status: intentStatus(text),
      opened: intentOpened(text),
    }))
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

const failedConclusions = new Set([
  "FAILURE",
  "CANCELLED",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE",
]);

export function checkState(rollup: CheckRollupItem[]): CheckState {
  if (
    rollup.some(
      (c) =>
        failedConclusions.has(c.conclusion ?? "") ||
        c.state === "FAILURE" ||
        c.state === "ERROR",
    )
  )
    return "failing";
  if (
    rollup.some((c) =>
      c.state === undefined
        ? c.status !== "COMPLETED"
        : c.state === "PENDING" || c.state === "EXPECTED",
    )
  )
    return "running";
  return rollup.length ? "passing" : "no checks";
}

const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
// "24 October 2026" as 20261024; Date.parse of this form is not standard.
function openedKey(opened: string) {
  const m = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(opened);
  const month = m ? months.indexOf(m[2]!.toLowerCase()) : -1;
  return m && month >= 0 ? +m[3]! * 10_000 + (month + 1) * 100 + +m[1]! : -1;
}

function boardColumn(status: string, open: boolean, plan: boolean) {
  const s = status.toLowerCase();
  if (s === "dropped") return "Dropped";
  if (open && (plan || s === "in build" || s === "done")) return "In build";
  if (s === "accepted") return "Accepted";
  if (s === "in build") return "In build";
  if (s === "done") return "Done";
  return "Draft";
}

// Branch copies replace main ones because an intent lands on main with its
// code; on an open pull request it is still in flight, whatever it says.
export function intentBoard(
  main: IntentFile[],
  open: OpenIntent[],
  repo: string,
): BoardCard[] {
  const latest = new Map<string, IntentFile | OpenIntent>();
  for (const file of main) latest.set(file.slug, file);
  const winners = new Map<string, OpenIntent>();
  for (const file of open) {
    const seen = winners.get(file.slug);
    if (!seen || file.pr.number > seen.pr.number) winners.set(file.slug, file);
  }
  for (const [slug, file] of winners) latest.set(slug, file);
  return [...latest.values()]
    .map((file) => {
      const pr = "pr" in file ? file.pr : undefined;
      const card: BoardCard = {
        slug: file.slug,
        title: /^# (.+)$/m.exec(file.text)?.[1]?.trim() || file.slug,
        opened: intentOpened(file.text),
        column: boardColumn(intentStatus(file.text), !!pr, !!file.plan),
        spec: !!file.spec,
        plan: !!file.plan,
        folder: `https://github.com/${repo}/tree/${pr?.headRefName ?? "main"}/intent/${file.slug}`,
      };
      if (pr)
        card.pr = {
          number: pr.number,
          url: pr.url,
          draft: pr.isDraft,
          checks: checkState(pr.statusCheckRollup),
        };
      return card;
    })
    .sort(
      (a, b) =>
        openedKey(b.opened) - openedKey(a.opened) ||
        (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
    );
}

export function snapshot(inputs: Inputs): Snapshot {
  const repo = inputs.repo ?? "newell-paul/sprint-scout";
  const base: Snapshot = {
    date: inputs.date,
    e2e: inputs.playwright ? summarise(inputs.playwright) : null,
    coverage: inputs.coverage
      ? {
          lines: inputs.coverage.total.lines.pct,
          branches: inputs.coverage.total.branches.pct,
        }
      : null,
    mutationScore: inputs.mutation ? mutationScore(inputs.mutation) : null,
  };
  if (inputs.sha) base.sha = inputs.sha;
  const extra: { [K in keyof Snapshot]?: Snapshot[K] | undefined } = {
    unit: inputs.unit ? summariseVitest(inputs.unit) : undefined,
    component: inputs.component ? summariseVitest(inputs.component) : undefined,
    typeCoverage: inputs.typeCoverage
      ? (inputs.typeCoverage.percent ??
        Number.parseFloat(inputs.typeCoverage.percentString ?? "") ??
        null)
      : undefined,
    lighthouse: inputs.lighthouse
      ? lighthouseSummary(inputs.lighthouse.manifest, inputs.lighthouse.results)
      : undefined,
    bundle: inputs.size
      ? inputs.size.map((s) => ({
          name: s.name,
          bytes: s.size,
          limitBytes: s.sizeLimit ?? null,
        }))
      : undefined,
    evals: inputs.evals
      ? {
          at: inputs.evals.at,
          model: inputs.evals.model,
          passed: inputs.evals.passed,
          total: inputs.evals.total,
          costUsd: inputs.evals.costUsd,
        }
      : undefined,
    pipeline: inputs.runs ? pipelineSummary(inputs.runs) : undefined,
    delivery: inputs.pulls
      ? deliverySummary(inputs.pulls, inputs.now ?? `${inputs.date}T23:59:59Z`)
      : undefined,
    intents: inputs.intents ? intentSummary(inputs.intents) : undefined,
    board: inputs.intents
      ? intentBoard(inputs.intents, inputs.openIntents ?? [], repo)
      : undefined,
    boardAt: inputs.intents ? inputs.date : undefined,
    repo: inputs.intents ? repo : undefined,
    review: inputs.reviews ? reviewSummary(inputs.reviews) : undefined,
  };
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) (base as Record<string, unknown>)[key] = value;
  }
  return base;
}

// Only the newest entry keeps its board and run list, so history does not grow by one per run.
export function appendHistory(history: Snapshot[], next: Snapshot, keep = 90) {
  const kept = [...history.filter((s) => s.date !== next.date), next]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-keep);
  return kept.map((s, i) => {
    if (i === kept.length - 1 || !("board" in s || s.pipeline?.recent))
      return s;
    const rest = { ...s };
    delete rest.board;
    delete rest.boardAt;
    if (rest.pipeline?.recent) {
      rest.pipeline = { ...rest.pipeline };
      delete rest.pipeline.recent;
    }
    return rest;
  });
}

// A manual Pages run rebuilds only the board; the rest of the newest entry
// stays as the last Checks run on main left it.
export function refreshBoard(
  history: Snapshot[],
  board: BoardCard[],
  date: string,
) {
  return history.map((s, i) =>
    i === history.length - 1 ? { ...s, board, boardAt: date } : s,
  );
}

export function flakeFreeStreak(history: Snapshot[]) {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const e2e = history[i]!.e2e;
    if (!e2e || e2e.failed > 0 || (e2e.flaky ?? 0) > 0) break;
    streak++;
  }
  return streak;
}

// Shields endpoint schema: https://shields.io/badges/endpoint-badge
export type Badge = {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
};

const tone = (good: boolean, watch: boolean) =>
  good ? "brightgreen" : watch ? "yellow" : "red";

export function badges(latest: Snapshot | undefined): Record<string, Badge> {
  const na = (label: string): Badge => ({
    schemaVersion: 1,
    label,
    message: "n/a",
    color: "lightgrey",
  });
  const level = (label: string, counts: Counts | null | undefined): Badge =>
    counts
      ? {
          schemaVersion: 1,
          label,
          message: `${counts.tests - counts.failed}/${counts.tests} pass`,
          color: counts.failed === 0 ? "brightgreen" : "red",
        }
      : na(label);
  if (!latest)
    return {
      unit: na("unit"),
      component: na("component"),
      evals: na("evals"),
      mutation: na("mutation"),
      coverage: na("coverage"),
      lighthouse: na("lighthouse"),
      e2e: na("e2e"),
    };
  const ev = latest.evals;
  const evalRate = ev && ev.total ? ev.passed / ev.total : null;
  const lh = latest.lighthouse;
  const lhMin = lh
    ? Math.min(lh.performance, lh.accessibility, lh.bestPractices)
    : null;
  return {
    unit: level("unit", latest.unit),
    component: level("component", latest.component),
    evals: ev
      ? {
          schemaVersion: 1,
          label: "evals",
          message: `${ev.passed}/${ev.total} pass`,
          color: tone(evalRate! >= 0.8, evalRate! >= 0.5),
        }
      : na("evals"),
    mutation:
      latest.mutationScore != null
        ? {
            schemaVersion: 1,
            label: "mutation",
            message: `${latest.mutationScore.toFixed(0)} %`,
            color: tone(latest.mutationScore >= 80, latest.mutationScore >= 60),
          }
        : na("mutation"),
    coverage: latest.coverage
      ? {
          schemaVersion: 1,
          label: "coverage",
          message: `${latest.coverage.lines.toFixed(0)} % lines`,
          color: tone(latest.coverage.lines >= 90, latest.coverage.lines >= 75),
        }
      : na("coverage"),
    lighthouse:
      lh && lhMin !== null
        ? {
            schemaVersion: 1,
            label: "lighthouse",
            message: `${lh.performance} · ${lh.accessibility} · ${lh.bestPractices}`,
            color: tone(lhMin >= 90, lhMin >= 70),
          }
        : na("lighthouse"),
    e2e: latest.e2e
      ? {
          schemaVersion: 1,
          label: "e2e",
          message: `${latest.e2e.tests - latest.e2e.failed}/${latest.e2e.tests} pass${latest.e2e.flaky ? ` · ${latest.e2e.flaky} flaky` : ""}`,
          color: tone(
            latest.e2e.failed === 0 && !latest.e2e.flaky,
            latest.e2e.failed === 0,
          ),
        }
      : na("e2e"),
  };
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
const percent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "n/a" : `${value.toFixed(digits)} %`;
const seconds = (ms: number | null | undefined) =>
  ms === null || ms === undefined ? "n/a" : `${(ms / 1000).toFixed(1)} s`;
const minutes = (ms: number | null | undefined) =>
  ms === null || ms === undefined ? "n/a" : `${(ms / 60_000).toFixed(1)} min`;
const kb = (bytes: number) => `${(bytes / 1000).toFixed(0)} kB`;
// Each unit is chosen after rounding, so 1.9995 h reads "2.0 h", not "120 min".
const cycleTime = (h: number | null | undefined) => {
  if (h === null || h === undefined) return "n/a";
  const minutes = Math.round(h * 60);
  if (minutes < 120) return `${minutes} min`;
  const hours = h.toFixed(1);
  return Number(hours) < 48 ? `${hours} h` : `${(h / 24).toFixed(1)} d`;
};

type Tone = "good" | "watch" | "poor" | "none";
const rate = (
  value: number | null | undefined,
  good: number,
  watch: number,
): Tone =>
  value === null || value === undefined
    ? "none"
    : value >= good
      ? "good"
      : value >= watch
        ? "watch"
        : "poor";
const under = (value: number | null | undefined, limit: number): Tone =>
  value === null || value === undefined
    ? "none"
    : value <= limit
      ? "good"
      : value <= limit * 1.2
        ? "watch"
        : "poor";

// With an area id the line gets a gradient fill below it; ids must be unique per page.
export function sparkline(
  values: (number | null | undefined)[],
  label: string,
  unit = "",
  { area, over = "days" }: { area?: string; over?: string } = {},
) {
  const points = values
    .map((v, i) => [i, v ?? null] as const)
    .filter((p): p is readonly [number, number] => p[1] !== null);
  if (points.length < 2) return "";
  const max = Math.max(...points.map((p) => p[1]));
  const min = Math.min(...points.map((p) => p[1]));
  const span = max - min || 1;
  const width = 240;
  const height = 48;
  const step = width / Math.max(values.length - 1, 1);
  const y = (v: number) =>
    (height - 6 - ((v - min) / span) * (height - 12)).toFixed(1);
  const path = points
    .map(([i, v], n) => `${n ? "L" : "M"}${(i * step).toFixed(1)} ${y(v)}`)
    .join(" ");
  const first = points[0]!;
  const last = points.at(-1)!;
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
  const fill = area
    ? `<defs><linearGradient id="${area}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="${path} L${(last[0] * step).toFixed(1)} ${height} L${(first[0] * step).toFixed(1)} ${height} Z" fill="url(#${area})"/>`
    : "";
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(label)} over the last ${points.length} ${over}, from ${fmt(min)} to ${fmt(max)}">${fill}<path d="${path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="${(last[0] * step).toFixed(1)}" cy="${y(last[1])}" r="3" fill="currentColor"/></svg>`;
}

// A ring on a 100-unit circumference, so the dash length is the percentage.
export function ring(
  fraction: number | null | undefined,
  tone: Tone,
  label: string,
  centre = "",
) {
  if (fraction === null || fraction === undefined) return "";
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return `<svg class="ring" viewBox="0 0 36 36" data-tone="${tone}" role="img" aria-label="${escapeHtml(label)}"><circle class="track" cx="18" cy="18" r="15.9155"/><circle class="arc" cx="18" cy="18" r="15.9155" stroke-dasharray="${pct.toFixed(1)} 100" transform="rotate(-90 18 18)"/>${centre ? `<text x="18" y="18">${escapeHtml(centre)}</text>` : ""}</svg>`;
}

export function meter(
  value: number | null | undefined,
  scale: number,
  tone: Tone,
  label: string,
  mark?: number,
) {
  if (value === null || value === undefined) return "";
  const at = (v: number) => `${Math.min(100, (v / scale) * 100).toFixed(1)}%`;
  return `<div class="meter" data-tone="${tone}" role="img" aria-label="${escapeHtml(label)}"><span class="fill" style="width:${at(value)}"></span>${mark === undefined ? "" : `<span class="mark" style="left:${at(mark)}"></span>`}</div>`;
}

// Rounded-top columns on soft grid lines; the newest column glows.
export function columns(values: number[], labels: string[], label: string) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  // An even top keeps the midline on a whole number.
  const top = Math.ceil(max / 2) * 2;
  const width = 900;
  const height = 220;
  const base = height - 20;
  const gap = 10;
  const w = (width - 28 - gap * (values.length - 1)) / values.length;
  const grid = [0, 0.5, 1]
    .map((f) => {
      const y = (base - f * (base - 8)).toFixed(1);
      return `<line x1="24" x2="${width}" y1="${y}" y2="${y}"/><text class="axis" x="18" y="${y}" text-anchor="end">${Math.round(f * top)}</text>`;
    })
    .join("");
  const cols = values
    .map((v, i) => {
      const x = 28 + i * (w + gap);
      const h = Math.max(3, (v / top) * (base - 8));
      const r = Math.min(5, w / 2, h);
      const y = base - h;
      const now = i === values.length - 1;
      return `<path${now ? ' class="now"' : ""} d="M${x.toFixed(1)} ${base} V${(y + r).toFixed(1)} Q${x.toFixed(1)} ${y.toFixed(1)} ${(x + r).toFixed(1)} ${y.toFixed(1)} H${(x + w - r).toFixed(1)} Q${(x + w).toFixed(1)} ${y.toFixed(1)} ${(x + w).toFixed(1)} ${(y + r).toFixed(1)} V${base} Z"/><text class="axis" x="${(x + w / 2).toFixed(1)}" y="${height - 4}" text-anchor="middle">${escapeHtml(labels[i] ?? "")}</text>`;
    })
    .join("");
  return `<svg class="columns" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}: ${values.join(", ")}"><defs><linearGradient id="col-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--watch)"/><stop offset="1" stop-color="var(--poor)" stop-opacity=".75"/></linearGradient></defs><g class="grid">${grid}</g><g fill="url(#col-fill)">${cols}</g></svg>`;
}

function card(
  name: string,
  value: string,
  options: {
    tone?: Tone | undefined;
    note?: string | undefined;
    chart?: string | undefined;
    ring?: string | undefined;
    className?: string | undefined;
  } = {},
) {
  const tone =
    options.tone && options.tone !== "none"
      ? ` data-tone="${options.tone}"`
      : "";
  const cls = options.className ? ` ${options.className}` : "";
  return `<div class="card${cls}"${tone}><div class="head"><div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd></div>${options.ring ?? ""}</div>${
    options.note ? `<p class="note">${escapeHtml(options.note)}</p>` : ""
  }${options.chart ? `<figure>${options.chart}</figure>` : ""}</div>`;
}

const runLabels: Record<RunResult, string> = {
  pass: "passed first time",
  rerun: "passed on a rerun",
  fail: "failed",
  cancelled: "cancelled",
};

function runsCard(recent: RecentRun[]) {
  if (!recent.length)
    return card("Recent runs", "n/a", { note: "No run data from GitHub" });
  const count = (result: RunResult) =>
    recent.filter((r) => r.result === result).length;
  const summary = (Object.keys(runLabels) as RunResult[])
    .map((r) => [r, count(r)] as const)
    .filter(([, n]) => n > 0);
  const label = `Last ${recent.length} runs on main, oldest first: ${summary.map(([r, n]) => `${n} ${runLabels[r]}`).join(", ")}`;
  const width = 600;
  const height = 120;
  const base = height - 18;
  const gap = 4;
  const w = (width - gap * (recent.length - 1)) / recent.length;
  const top = Math.max(...recent.map((r) => r.durationMs), 60_000);
  const bars = recent
    .map((r, i) => {
      const h = Math.max(3, (r.durationMs / top) * (base - 16));
      return `<rect data-run="${r.result}"${i === recent.length - 1 ? ' class="now"' : ""} x="${(i * (w + gap)).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3, w / 2).toFixed(1)}"><title>${escapeHtml(r.at.slice(0, 16).replace("T", " "))} UTC: ${runLabels[r.result]}, ${minutes(r.durationMs)}</title></rect>`;
    })
    .join("");
  const chart = `<svg class="runs" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}"><text class="axis" x="0" y="9">${minutes(top)}</text><line x1="0" x2="${width}" y1="${base}" y2="${base}"/>${bars}<text class="axis" x="0" y="${height - 2}">${recent.length} runs ago</text><text class="axis" x="${width}" y="${height - 2}" text-anchor="end">latest</text></svg>`;
  const legend = summary
    .map(
      ([r, n]) =>
        `<li data-run="${r}"><span>${n}</span> ${r === "pass" ? "first time" : runLabels[r]}</li>`,
    )
    .join("");
  return `<div class="card span2"><dt>Last ${recent.length} runs</dt><dd class="sr">${escapeHtml(label)}</dd>${chart}<ul class="legend">${legend}</ul><p class="note">Bar height is run time. A cancelled run was superseded by a newer push.</p></div>`;
}

const section = (id: string, title: string, lead: string, body: string) =>
  `<section id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${escapeHtml(title)}</h2><p class="lead">${escapeHtml(lead)}</p>${body}</section>`;

const counts = (c: Counts | null | undefined) =>
  c ? `${c.tests - c.failed} / ${c.tests} passed` : "n/a";

export type Annotation = { label: string; level: number; reason: string };

const tick = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--good)"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--bg)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function bandsPanel(annotations: Annotation[]) {
  const breaches = annotations.filter((a) => a.level >= 2);
  if (!annotations.length) return "";
  if (!breaches.length)
    return `<p class="bands" data-level="0">${tick}<span><strong>All within band</strong>Bands: every metric is within its ${annotations.length}-band envelope.</span></p>`;
  const items = breaches
    .map(
      (a) =>
        `<li data-level="${a.level}"><strong>${escapeHtml(a.label)}</strong>: ${escapeHtml(a.reason)}</li>`,
    )
    .join("");
  const worst = Math.max(...breaches.map((a) => a.level));
  return `<section class="bands" data-level="${worst}" aria-labelledby="bands-h"><h2 id="bands-h">${worst >= 3 ? "Out of band" : "Drifting"}</h2><p class="lead">${worst >= 3 ? "A metric left its 3σ band; this run failed the dashboard job." : "A metric left its 2σ band around the previous runs."} Bands are defined in <code>packages/testing/bands.yaml</code>.</p><ul>${items}</ul></section>`;
}

const docsText = (c: BoardCard) =>
  c.spec && c.plan
    ? "Spec and plan"
    : c.spec
      ? "Spec, no plan"
      : c.plan
        ? "Plan, no spec"
        : "No spec or plan";

const shortDate = (opened: string) =>
  opened.replace(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/, "$1 $2 $3");

const boardCard = (c: BoardCard) =>
  `<li class="intent"><a href="${escapeHtml(c.folder)}"><strong>${escapeHtml(c.title)}</strong></a>` +
  `<p class="pills"><code>${escapeHtml(c.slug)}</code>${
    c.pr
      ? `<a class="pr" data-checks="${c.pr.checks}" href="${escapeHtml(c.pr.url)}">#${c.pr.number}${c.pr.draft ? " draft" : ""} · ${c.pr.checks}</a>`
      : ""
  }</p>` +
  `<p class="meta"><span>${escapeHtml(shortDate(c.opened))}</span><span>${docsText(c)}</span></p>` +
  `</li>`;

const boardList = (cards: BoardCard[]) =>
  cards.length
    ? `<ul>${cards.map(boardCard).join("")}</ul>`
    : `<p class="ghost">Nothing here</p>`;

const shownPerColumn = 5;
const columnList = (cards: BoardCard[]) =>
  cards.length > shownPerColumn
    ? boardList(cards.slice(0, shownPerColumn)) +
      `<details class="more"><summary>+ Show ${cards.length - shownPerColumn} more</summary>${boardList(cards.slice(shownPerColumn))}</details>`
    : boardList(cards);

function boardHtml(latest: Snapshot) {
  const cards = latest.board ?? [];
  const rebuild = latest.repo
    ? `<p class="note">Built on ${escapeHtml(latest.boardAt ?? latest.date)}. <a href="https://github.com/${escapeHtml(latest.repo)}/actions/workflows/pages.yml">Rebuild now</a></p>`
    : "";
  if (!cards.length) return rebuild + `<p class="muted">No intents</p>`;
  const cols = (["Draft", "Accepted", "In build", "Done"] as const)
    .map((name) => {
      const inColumn = cards.filter((c) => c.column === name);
      return `<div class="column"${inColumn.length ? "" : " data-empty"}><h3>${name} <span class="count">${inColumn.length}</span></h3>${columnList(inColumn)}</div>`;
    })
    .join("");
  const dropped = cards.filter((c) => c.column === "Dropped");
  return (
    rebuild +
    `<div class="board">${cols}</div>` +
    (dropped.length
      ? `<details class="dropped"><summary>Dropped (${dropped.length})</summary>${boardList(dropped)}</details>`
      : "")
  );
}

const weekLabels = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    i === n - 1 ? "This wk" : `−${n - 1 - i}w`,
  );

export function render(history: Snapshot[], annotations: Annotation[] = []) {
  const latest = history.at(-1);
  if (!latest) return "<p>No test runs recorded yet.</p>";
  const trend = (
    pick: (s: Snapshot) => number | null | undefined,
    label: string,
    unit = "",
    area?: string,
  ) => sparkline(history.map(pick), label, unit, area ? { area } : {});

  const pipeline = latest.pipeline;
  const firstPassTone = rate(pipeline?.firstPassRate, 90, 75);
  const pipelineCards = [
    card("Checks duration", minutes(pipeline?.durationMs), {
      tone: under(pipeline?.durationMs, 15 * 60_000),
      note: "Latest run on main, queue to completion",
      chart: trend(
        (s) =>
          s.pipeline?.durationMs == null
            ? null
            : +(s.pipeline.durationMs / 60_000).toFixed(1),
        "Checks duration",
        " min",
      ),
    }),
    card("First-pass success", percent(pipeline?.firstPassRate, 0), {
      tone: firstPassTone,
      note: "Runs on main that passed at the first attempt, of the last 30 less any cancelled",
      ring: ring(
        pipeline?.firstPassRate == null ? null : pipeline.firstPassRate / 100,
        firstPassTone,
        "First-pass success",
      ),
      chart: trend(
        (s) => s.pipeline?.firstPassRate,
        "First-pass success",
        " %",
      ),
    }),
  ];

  pipelineCards.push(runsCard(pipeline?.recent ?? []));

  const e2e = latest.e2e;
  const streak = flakeFreeStreak(history);
  const slowest = (e2e?.slowest ?? [])
    .slice(0, 5)
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.title)}</td><td><code>${escapeHtml(t.project)}</code></td><td class="num" data-tone="${t.durationMs >= 20_000 ? "poor" : "none"}">${seconds(t.durationMs)}</td></tr>`,
    )
    .join("");
  const testCards = [
    card("Unit", counts(latest.unit), {
      tone: latest.unit ? (latest.unit.failed ? "poor" : "good") : "none",
      note: latest.unit
        ? `in ${seconds(latest.unit.durationMs)}`
        : "No unit report",
    }),
    card("Component", counts(latest.component), {
      tone: latest.component
        ? latest.component.failed
          ? "poor"
          : "good"
        : "none",
      note: latest.component
        ? `in ${seconds(latest.component.durationMs)}`
        : "No component report",
    }),
    card("End to end", counts(e2e), {
      tone: e2e ? (e2e.failed ? "poor" : "good") : "none",
      note: e2e
        ? `in ${seconds(e2e.durationMs)} across three browsers`
        : "No e2e report",
      chart: trend(
        (s) => (s.e2e ? +(s.e2e.durationMs / 1000).toFixed(1) : null),
        "End-to-end duration",
        " s",
      ),
    }),
    card("Flake-free streak", `${streak} run${streak === 1 ? "" : "s"}`, {
      tone: streak >= 10 ? "good" : streak >= 3 ? "watch" : "none",
      note: "Consecutive runs on main with no end-to-end failure",
    }),
  ];

  const gate = (
    name: string,
    value: number | null | undefined,
    tone: Tone,
    digits: number,
    note?: string,
  ) =>
    card(name, percent(value, digits), {
      tone,
      note,
      ring: ring(value == null ? null : value / 100, tone, name),
    });
  const qualityCards = [
    gate(
      "Line coverage",
      latest.coverage?.lines,
      rate(latest.coverage?.lines, 90, 75),
      1,
    ),
    gate(
      "Branch coverage",
      latest.coverage?.branches,
      rate(latest.coverage?.branches, 85, 70),
      1,
    ),
    gate(
      "Mutation score",
      latest.mutationScore,
      rate(latest.mutationScore, 80, 60),
      1,
      "Latest manual Stryker run",
    ),
    gate(
      "Type coverage",
      latest.typeCoverage,
      rate(latest.typeCoverage, 99.5, 98),
      2,
      "Gate at 99.5 %",
    ),
  ];

  const lh = latest.lighthouse;
  const bundle = latest.bundle ?? [];
  const score = (name: string, short: string, value: number) =>
    `<li>${ring(value / 100, value > 90 ? "good" : value >= 70 ? "watch" : "poor", `${name} ${value}`, `${value}`)}<span>${short}</span></li>`;
  const lighthouseCard = `<div class="card wide"${lh ? ` data-tone="${rate(Math.min(lh.performance, lh.accessibility, lh.bestPractices), 90, 70)}"` : ""}><dt>Lighthouse</dt>${
    lh
      ? `<dd class="sr">${lh.performance} · ${lh.accessibility} · ${lh.bestPractices} · ${lh.seo}</dd><ul class="scores">${score("Performance", "Perf", lh.performance)}${score("Accessibility", "A11y", lh.accessibility)}${score("Best practices", "BP", lh.bestPractices)}${score("SEO", "SEO", lh.seo)}</ul>`
      : "<dd>n/a</dd>"
  }<p class="note">Desktop preset on the static export</p></div>`;
  const lcpTone = under(lh?.lcpMs, 2500);
  const tbtTone = under(lh?.tbtMs, 300);
  const perfCards = [
    lighthouseCard,
    card(
      "Largest contentful paint",
      lh?.lcpMs == null ? "n/a" : `${lh.lcpMs} ms`,
      {
        tone: lcpTone,
        note: "Budget 2500 ms",
        chart: meter(
          lh?.lcpMs,
          2500,
          lcpTone,
          "Largest contentful paint against its budget",
        ),
      },
    ),
    card("Total blocking time", lh?.tbtMs == null ? "n/a" : `${lh.tbtMs} ms`, {
      tone: tbtTone,
      note: "Budget 300 ms",
      chart: meter(
        lh?.tbtMs,
        300,
        tbtTone,
        "Total blocking time against its budget",
      ),
    }),
    ...bundle.map((b) => {
      const tone =
        b.limitBytes === null ? "none" : under(b.bytes, b.limitBytes);
      return card(b.name, kb(b.bytes), {
        tone,
        className: "wide",
        note: b.limitBytes === null ? undefined : `Ceiling ${kb(b.limitBytes)}`,
        chart:
          b.limitBytes === null
            ? undefined
            : meter(
                b.bytes,
                b.limitBytes * 1.1,
                tone,
                `${b.name} against its ceiling`,
                b.limitBytes,
              ),
      });
    }),
  ];
  if (!bundle.length)
    perfCards.push(
      card("Client JavaScript", "n/a", { note: "No size report" }),
    );

  const ev = latest.evals;
  const review = latest.review;
  const intents = latest.intents ?? [];
  const byStatus = new Map<string, number>();
  for (const i of intents)
    byStatus.set(i.status, (byStatus.get(i.status) ?? 0) + 1);
  const aiCards = [
    `<div class="card hero"${ev && ev.total ? ` data-tone="${rate((ev.passed / ev.total) * 100, 80, 50)}"` : ""}><dt>Eval pass rate</dt><dd>${ev ? `${ev.passed} / ${ev.total}` : "n/a"}</dd><p class="note">${ev ? `passed · ${ev.at.slice(0, 10)} · $${ev.costUsd.toFixed(3)}` : "No eval run recorded yet"}</p>${ev ? `<p class="pills"><code>${escapeHtml(ev.model)}</code></p>` : ""}</div>`,
    card("Intents", intents.length ? `${intents.length}` : "n/a", {
      className: "trend",
      note: intents.length
        ? [...byStatus].map(([s, n]) => `${n} ${s}`).join(" · ")
        : "No intent folder",
      chart: trend((s) => s.intents?.length, "Intents", "", "intents-fill"),
    }),
    card(
      "Review findings",
      review ? `${totalFindings(review.findings)}` : "n/a",
      {
        className: "trend",
        tone: review
          ? review.findings.blocker
            ? "poor"
            : review.findings.major
              ? "watch"
              : "good"
          : "none",
        note: review
          ? `${severities.map((s) => `${review.findings[s]} ${s}`).join(" · ")} over ${review.pulls} pull request${review.pulls === 1 ? "" : "s"}`
          : "Not collected yet: arrives with the review workflow",
        chart: review
          ? sparkline(
              review.perPull.map((p) => p.total),
              "Review findings",
              "",
              { area: "findings-fill", over: "pull requests" },
            )
          : "",
      },
    ),
    card(
      "Fixed after review",
      review && review.resolvedShare !== null
        ? percent(review.resolvedShare, 0)
        : "n/a",
      {
        tone: review ? rate(review.resolvedShare, 80, 50) : "none",
        ring: review
          ? ring(
              review.resolvedShare === null ? null : review.resolvedShare / 100,
              rate(review.resolvedShare, 80, 50),
              "Fixed after review",
            )
          : "",
        note: review
          ? `${review.resolved} of ${review.threads} reviewer threads resolved, by the fix loop or by hand`
          : "Share of reviewer threads resolved, by the fix loop or by hand",
      },
    ),
  ];

  const delivery = latest.delivery;
  const deliveryCards = `<div class="delivery"><div class="stack">${card(
    "PR cycle time",
    cycleTime(delivery?.medianCycleHours),
    {
      tone: under(delivery?.medianCycleHours, 48),
      note: "Median from opened to merged",
    },
  )}${card(
    "Merges per week",
    delivery ? `${delivery.mergesPerWeek.at(-1) ?? 0}` : "n/a",
    { note: "This week; the chart shows the last eight" },
  )}</div><div class="card chart"><dt>Merges per week</dt>${
    delivery
      ? columns(
          delivery.mergesPerWeek,
          weekLabels(delivery.mergesPerWeek.length),
          "Merges per week",
        )
      : `<p class="ghost">No pull request data</p>`
  }</div></div>`;

  const grid = (cards: string[], variant = "") =>
    `<dl class="grid${variant ? ` ${variant}` : ""}">${cards.join("")}</dl>`;
  const commit = latest.sha
    ? ` at <code>${escapeHtml(latest.sha.slice(0, 7))}</code>`
    : "";
  const source = latest.repo
    ? `<a class="gh" href="https://github.com/${escapeHtml(latest.repo)}" aria-label="Source on GitHub"><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>SprintScout engineering dashboard</title>
<link rel="icon" type="image/png" href="logo-mark.png">
<style>
:root{--brand-scout:#2dd4bf;--bg:#1e2a3a;--surface:#263345;--raised:#2e3d52;--ink:#ffffff;--muted:#a5b4c8;--border:rgba(148,163,184,.28);--line:rgba(148,163,184,.4);--good:#2dd4bf;--watch:#f97316;--poor:#ef4444;--poor-text:#f87171;--accent:#2dd4bf;--ease:200ms ease}
@font-face{font-family:Inter;src:url("fonts/inter-latin-variable.woff2") format("woff2");font-weight:400 800;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url("fonts/jetbrains-mono-latin-variable.woff2") format("woff2");font-weight:400 700;font-display:swap}
*{box-sizing:border-box}
body{font:15px/1.5 Inter,"Helvetica Neue",Arial,system-ui,sans-serif;margin:0;padding:28px 16px 56px;color:var(--ink);background:radial-gradient(900px 520px at 8% -10%,rgba(56,189,248,.08),transparent 60%),var(--bg);background-attachment:fixed;min-height:100vh}
main{max-width:76rem;margin-inline:auto}
a{color:var(--accent)}
.top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 24px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.title{text-align:right}.title p{margin:6px 0 0;display:flex;align-items:center;justify-content:flex-end;gap:8px;font-size:.88rem}
.gh{display:inline-flex;color:var(--ink);transition:color var(--ease)}.gh:hover,.gh:focus-visible{color:var(--accent)}
h1{font:800 2rem/1.15 Inter,"Helvetica Neue",Arial,sans-serif;letter-spacing:-.025em;margin:0}
h2{font:700 1.15rem/1.3 Inter,"Helvetica Neue",Arial,sans-serif;margin:40px 0 2px;letter-spacing:-.01em}
h3{font-weight:600}
.lead,.muted,.note{color:var(--muted)}.lead{margin:0 0 14px;font-size:.9rem}
header code{border:1px solid var(--line)}
nav{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 0}
nav a{color:var(--ink);text-decoration:none;font-size:.95rem;padding:8px 18px;border-radius:999px;background:var(--surface);border:1px solid var(--line);transition:border-color var(--ease),box-shadow var(--ease),color var(--ease)}
nav a:hover,nav a:focus-visible{border-color:var(--accent);color:var(--accent);box-shadow:0 0 16px -4px var(--accent);outline:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:12px;margin:0}
.card{--tone:var(--line);position:relative;background:rgba(41,54,72,.85);border:1px solid rgba(45,212,191,.22);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:18px 20px;min-width:0;transition:transform var(--ease),box-shadow var(--ease),border-color var(--ease)}
.card[data-tone=good]{--tone:var(--good)}.card[data-tone=watch]{--tone:var(--watch)}.card[data-tone=poor]{--tone:var(--poor)}
.card:hover{transform:translateY(-2px);border-color:rgba(45,212,191,.45);box-shadow:0 12px 40px rgba(0,0,0,.45)}
.head{display:flex;justify-content:space-between;align-items:center;gap:12px}
dt{font-size:.8rem;color:var(--muted);font-weight:500}dd{margin:6px 0 0;font-size:1.85rem;font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;letter-spacing:-.01em}
.note{margin:4px 0 0;font-size:.8rem}
figure{margin:10px 0 0;color:var(--tone)}.card:not([data-tone]) figure{color:var(--accent)}.spark{display:block;width:100%;height:auto;max-height:56px}
.ring{width:56px;height:56px;flex:none;--tone:var(--muted)}.ring[data-tone=good]{--tone:var(--good)}.ring[data-tone=watch]{--tone:var(--watch)}.ring[data-tone=poor]{--tone:var(--poor)}
.ring circle{fill:none;stroke-width:3.2}.ring .track{stroke:var(--border)}.ring .arc{stroke:var(--tone);stroke-linecap:round;filter:drop-shadow(0 0 2px var(--tone))}
.ring text{fill:var(--ink);font:700 10px "JetBrains Mono",ui-monospace,monospace;text-anchor:middle;dominant-baseline:central}
.meter{position:relative;height:6px;border-radius:999px;background:var(--border);--tone:var(--accent)}.meter[data-tone=watch]{--tone:var(--watch)}.meter[data-tone=poor]{--tone:var(--poor)}
.meter .fill{position:absolute;inset:0 auto 0 0;border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--tone) 55%,transparent),var(--tone));box-shadow:0 0 10px -2px var(--tone)}
.meter .mark{position:absolute;top:-5px;bottom:-5px;width:2px;background:var(--ink);border-radius:1px}
.scores{list-style:none;display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 0;padding:0}.scores li{display:grid;justify-items:center;gap:2px;font-size:.72rem;color:var(--muted)}.scores .ring{width:54px;height:54px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
table{border-collapse:separate;border-spacing:0;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}
caption{padding:0 0 8px;font-size:.85rem}
th{background:var(--raised);font-size:.82rem;color:var(--muted);font-weight:600}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--border);font-size:.88rem}tr:last-child td{border-bottom:0}tbody tr{transition:background var(--ease)}tbody tr:hover{background:var(--raised)}
.num{text-align:right;font-variant-numeric:tabular-nums}td.num[data-tone=poor]{color:var(--poor-text);font-weight:700}
code,dd,td.num{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace}
code{font-size:.8em;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);padding:2px 7px;border-radius:999px}
.split{display:grid;gap:0 28px}@media (min-width:1000px){.split{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}}
.split .grid{grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))}
.wide{grid-column:1/-1}@media (min-width:560px){.span2{grid-column:span 2}}
@media (min-width:900px){.pipeline{grid-template-columns:repeat(2,minmax(0,1fr)) minmax(0,1.6fr)}.pipeline .span2{grid-column:auto}}
.runs{display:block;width:100%;height:auto;margin-top:10px}.runs line{stroke:var(--border)}.runs .axis{fill:var(--muted);font:10px "JetBrains Mono",ui-monospace,monospace}.runs rect{fill:var(--run);opacity:.8;transition:opacity var(--ease)}.runs rect:hover,.runs .now{opacity:1}.runs .now{filter:drop-shadow(0 0 5px var(--run))}
[data-run=pass]{--run:var(--good)}[data-run=rerun]{--run:var(--watch)}[data-run=fail]{--run:var(--poor)}[data-run=cancelled]{--run:var(--line)}
.legend{list-style:none;display:flex;flex-wrap:wrap;gap:4px 16px;margin:12px 0 0;padding:0;font-size:.8rem;color:var(--muted)}.legend li::before{content:"";display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;background:var(--run)}.legend span{font-family:"JetBrains Mono",ui-monospace,monospace;color:var(--ink)}
.board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start}@media (min-width:720px){.board{grid-template-columns:repeat(4,minmax(0,1fr))}}
.column{background:rgba(41,54,72,.6);border:1px solid rgba(45,212,191,.18);border-radius:16px;padding:10px;min-width:0}
.column h3{display:flex;align-items:center;gap:8px;margin:2px 2px 10px;font-size:.88rem;color:var(--muted)}
.count{font:600 .72rem "JetBrains Mono",ui-monospace,monospace;color:var(--ink);background:var(--border);border-radius:999px;padding:1px 8px}
.board ul,.dropped ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.intent{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 11px;overflow-wrap:anywhere;transition:border-color var(--ease),transform var(--ease)}
.intent:hover{border-color:color-mix(in srgb,var(--accent) 50%,var(--border));transform:translateY(-1px)}
.intent>a{color:var(--ink);text-decoration:none;font-size:.88rem;line-height:1.3}.intent>a:hover{color:var(--accent)}
.pills{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 0}.pills code{font-size:.7rem}
.pr{font:.7rem "JetBrains Mono",ui-monospace,monospace;text-decoration:none;padding:2px 7px;border-radius:999px;background:var(--border);color:var(--muted)}
[data-checks=failing]{color:var(--poor-text);background:color-mix(in srgb,var(--poor) 16%,var(--surface))}[data-checks=passing]{color:var(--good)}[data-checks=running]{color:var(--watch)}
.meta{display:flex;justify-content:space-between;gap:8px;margin:8px 0 0;font-size:.7rem;color:var(--muted)}
.ghost{margin:0;border:1px dashed var(--line);border-radius:10px;padding:22px 8px;text-align:center;font-size:.8rem;color:var(--muted)}
.dropped,.more{margin-top:12px}.more{margin-top:8px}.dropped summary,.more summary{cursor:pointer;color:var(--muted);font-size:.82rem;text-align:center;padding:6px;border-radius:8px;list-style:none;transition:color var(--ease),background var(--ease)}.more summary:hover{color:var(--accent);background:var(--border)}.more ul{margin-top:8px}
.hero{display:grid;place-content:center;text-align:center;border-color:var(--tone);box-shadow:0 0 36px -10px var(--tone),inset 0 0 24px -16px var(--tone)}.hero dd{font-size:2.4rem;color:var(--tone)}.hero .pills{justify-content:center}
.card.trend figure{color:var(--watch)}
.delivery{display:grid;gap:12px}@media (min-width:760px){.delivery{grid-template-columns:minmax(14rem,1fr) 3fr}}
.stack{display:grid;gap:12px;align-content:start}
.columns{display:block;width:100%;height:auto;margin-top:8px}.columns .grid line{stroke:var(--border);stroke-dasharray:3 4}.columns .axis{fill:var(--muted);font:10px "JetBrains Mono",ui-monospace,monospace}
.columns path{transition:opacity var(--ease)}.columns path:not(.now){opacity:.72}.columns path:hover{opacity:1}.columns .now{filter:drop-shadow(0 0 6px var(--watch))}
.brand{display:inline-flex;align-items:center;gap:14px;margin:0;color:var(--ink);text-decoration:none;transform:skewX(-12deg);transform-origin:left bottom}.brand img{display:block;filter:drop-shadow(0 0 6px rgba(45,212,191,.45))}.brand span{font-weight:800;font-size:2.6rem;line-height:1;letter-spacing:-.03em;white-space:nowrap}.brand b{font-weight:700;color:var(--brand-scout)}
@media (max-width:600px){.brand{gap:10px}.brand img{width:40px;height:40px}.brand span{font-size:2rem}h1{font-size:1.6rem}.title{text-align:left}.title p{justify-content:flex-start}th:nth-child(2),td:nth-child(2){display:none}}
footer{margin-top:48px;font-size:.85rem;color:var(--muted)}
.bands{margin-top:18px;border-radius:14px;padding:12px 16px;background:var(--surface);border:1px solid var(--border)}
p.bands{display:flex;gap:12px;align-items:center;font-size:.88rem;color:var(--muted);background:linear-gradient(100deg,color-mix(in srgb,var(--good) 14%,var(--surface)),var(--surface) 70%);border-color:color-mix(in srgb,var(--good) 45%,var(--border))}
p.bands strong{display:block;color:var(--ink)}p.bands svg{flex:none;filter:drop-shadow(0 0 6px var(--good))}
.bands[data-level="2"]{border-color:var(--watch);background:color-mix(in srgb,var(--watch) 12%,var(--surface))}.bands[data-level="3"]{border-color:var(--poor);background:color-mix(in srgb,var(--poor) 12%,var(--surface))}
.bands h2{margin:0 0 2px}.bands ul{margin:4px 0 0;padding-left:20px}.bands li{margin:2px 0}
@media (prefers-reduced-motion:reduce){*{transition:none!important}.card:hover,.intent:hover{transform:none}}
</style>
</head>
<body>
<main>
<header class="top"><a class="brand" href="../" aria-label="SprintScout planner"><img src="logo-mark.svg" width="52" height="52" alt=""><span>Sprint<b>Scout</b></span></a>
<div class="title"><h1>Engineering dashboard</h1><p class="muted">${source}<span>Built from main${commit} on ${escapeHtml(latest.date)} · trends over ${history.length} day${history.length === 1 ? "" : "s"}</span></p></div></header>
<nav aria-label="Sections"><a href="#pipeline">Pipeline</a><a href="#tests">Tests</a><a href="#board">Intent board</a><a href="#quality">Quality gates</a><a href="#performance">Performance</a><a href="#ai">AI practice</a><a href="#delivery">Delivery</a><a href="#slowest">Slowest tests</a></nav>
${bandsPanel(annotations)}
${section("pipeline", "Pipeline", "The Checks workflow on main: static gates, unit, component, end-to-end, deploy gate.", grid(pipelineCards, "pipeline"))}
${section("tests", "Tests", "Counts per level from the latest run; trend over the recorded runs.", grid(testCards))}
<div class="split">
${section("board", "Intent board", "Intents on main and on open pull requests, as they stood when this dashboard was built.", boardHtml(latest))}
<div>
${section("quality", "Quality gates", "Coverage from the merged unit shards, mutation score from the last manual Stryker run, type coverage from the static gate.", grid(qualityCards))}
${section("performance", "Performance", "The deploy gate runs Lighthouse against the static export and checks client JavaScript against its ceiling.", grid(perfCards))}
</div>
</div>
${section("ai", "AI practice", "Evals prove the agent configuration steers an agent; intents are the audit trail of work asked for and delivered.", grid(aiCards))}
${section("delivery", "Delivery", "Pull requests merged into main, read from the GitHub API by the dashboard job.", deliveryCards)}
${section("slowest", "Slowest tests", "The five slowest end-to-end tests in the latest run, across all three browser projects.", `<table><thead><tr><th>Test</th><th>Project</th><th class="num">Duration</th></tr></thead><tbody>${slowest || '<tr><td colspan="3" class="muted">No end-to-end report</td></tr>'}</tbody></table>`)}
<footer>Built by the Checks workflow after every push to main. No scripts, no external requests. Source: <code>packages/testing/src/dashboard.ts</code>.</footer>
</main>
</body>
</html>
`;
}
