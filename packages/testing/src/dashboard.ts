// Builds the engineering dashboard on main: one snapshot per run appended to
// a 90-run history, rendered as a static page with no scripts, plus shields
// endpoint badges. Every input is optional; a missing report leaves its cards
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
  pipeline?: { durationMs: number | null; firstPassRate: number | null } | null;
  delivery?: {
    medianCycleHours: number | null;
    mergesPerWeek: number[];
  } | null;
  intents?: { slug: string; status: string; opened: string }[] | null;
  board?: BoardCard[] | null;
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
  const completed = runs.filter((r) => r.conclusion !== null).slice(0, window);
  const latest = completed[0];
  const firstPass = completed.filter(
    (r) => r.conclusion === "success" && (r.attempt ?? 1) === 1,
  ).length;
  return {
    durationMs: latest
      ? Math.max(0, Date.parse(latest.updatedAt) - Date.parse(latest.createdAt))
      : null,
    firstPassRate: completed.length
      ? (firstPass / completed.length) * 100
      : null,
  };
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

const intentStatus = (text: string) =>
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
      ? intentBoard(
          inputs.intents,
          inputs.openIntents ?? [],
          inputs.repo ?? "newell-paul/sprint-scout",
        )
      : undefined,
    review: inputs.reviews ? reviewSummary(inputs.reviews) : undefined,
  };
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) (base as Record<string, unknown>)[key] = value;
  }
  return base;
}

// Only the newest entry keeps its board, so history does not grow by one per run.
export function appendHistory(history: Snapshot[], next: Snapshot, keep = 90) {
  const kept = [...history.filter((s) => s.date !== next.date), next]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-keep);
  return kept.map((s, i) => {
    if (i === kept.length - 1 || !("board" in s)) return s;
    const rest = { ...s };
    delete rest.board;
    return rest;
  });
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
  if (!latest)
    return {
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
    evals: ev
      ? {
          schemaVersion: 1,
          label: "evals",
          message: `${ev.passed}/${ev.total} pass`,
          color: tone(evalRate! >= 0.8, evalRate! >= 0.5),
        }
      : na("evals"),
    mutation:
      latest.mutationScore !== null
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
const hours = (h: number | null | undefined) =>
  h === null || h === undefined
    ? "n/a"
    : h < 48
      ? `${h.toFixed(1)} h`
      : `${(h / 24).toFixed(1)} d`;

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

export function sparkline(
  values: (number | null | undefined)[],
  label: string,
  unit = "",
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
  const last = points.at(-1)!;
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(label)} over the last ${points.length} runs, from ${fmt(min)} to ${fmt(max)}"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="${(last[0] * step).toFixed(1)}" cy="${y(last[1])}" r="3" fill="currentColor"/></svg>`;
}

export function bars(values: number[], label: string) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const width = 240;
  const height = 48;
  const gap = 4;
  const w = (width - gap * (values.length - 1)) / values.length;
  const rects = values
    .map((v, i) => {
      const h = Math.max(2, (v / max) * (height - 4));
      return `<rect x="${(i * (w + gap)).toFixed(1)}" y="${(height - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
    })
    .join("");
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(label)}: ${values.join(", ")}" fill="currentColor">${rects}</svg>`;
}

function card(
  name: string,
  value: string,
  options: {
    tone?: Tone | undefined;
    note?: string | undefined;
    chart?: string | undefined;
  } = {},
) {
  const tone =
    options.tone && options.tone !== "none"
      ? ` data-tone="${options.tone}"`
      : "";
  return `<div class="card"${tone}><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd>${
    options.note ? `<p class="note">${escapeHtml(options.note)}</p>` : ""
  }${options.chart ? `<figure>${options.chart}</figure>` : ""}</div>`;
}

const section = (id: string, title: string, lead: string, body: string) =>
  `<section id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${escapeHtml(title)}</h2><p class="lead">${escapeHtml(lead)}</p>${body}</section>`;

const counts = (c: Counts | null | undefined) =>
  c ? `${c.tests - c.failed} / ${c.tests} passed` : "n/a";

export type Annotation = { label: string; level: number; reason: string };

function bandsPanel(annotations: Annotation[]) {
  const breaches = annotations.filter((a) => a.level >= 2);
  if (!annotations.length) return "";
  if (!breaches.length)
    return `<p class="bands" data-level="0">Bands: every metric is within its ${annotations.length}-band envelope.</p>`;
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

const boardCard = (c: BoardCard) =>
  `<li class="intent"><a href="${escapeHtml(c.folder)}"><strong>${escapeHtml(c.title)}</strong></a>` +
  `<p class="note"><code>${escapeHtml(c.slug)}</code>${c.opened ? ` · ${escapeHtml(c.opened)}` : ""}</p>` +
  `<p class="note">${docsText(c)}</p>` +
  (c.pr
    ? `<p class="note" data-checks="${c.pr.checks}"><a href="${escapeHtml(c.pr.url)}">#${c.pr.number}</a>${c.pr.draft ? " draft" : ""} · ${c.pr.checks}</p>`
    : "") +
  `</li>`;

const boardList = (cards: BoardCard[]) =>
  cards.length
    ? `<ul>${cards.map(boardCard).join("")}</ul>`
    : `<p class="note">None</p>`;

function boardHtml(cards: BoardCard[]) {
  if (!cards.length) return `<p class="muted">No intents</p>`;
  const columns = (["Draft", "Accepted", "In build", "Done"] as const)
    .map((name) => {
      const inColumn = cards.filter((c) => c.column === name);
      return `<div class="column"><h3>${name} <span class="muted">${inColumn.length}</span></h3>${boardList(inColumn)}</div>`;
    })
    .join("");
  const dropped = cards.filter((c) => c.column === "Dropped");
  return (
    `<div class="board">${columns}</div>` +
    (dropped.length
      ? `<details class="dropped"><summary>Dropped (${dropped.length})</summary>${boardList(dropped)}</details>`
      : "")
  );
}

export function render(history: Snapshot[], annotations: Annotation[] = []) {
  const latest = history.at(-1);
  if (!latest) return "<p>No test runs recorded yet.</p>";
  const trend = (
    pick: (s: Snapshot) => number | null | undefined,
    label: string,
    unit = "",
  ) => sparkline(history.map(pick), label, unit);

  const pipeline = latest.pipeline;
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
      tone: rate(pipeline?.firstPassRate, 90, 75),
      note: "Runs on main that passed at the first attempt, last 30",
      chart: trend(
        (s) => s.pipeline?.firstPassRate,
        "First-pass success",
        " %",
      ),
    }),
  ];

  const e2e = latest.e2e;
  const streak = flakeFreeStreak(history);
  const slowest = (e2e?.slowest ?? [])
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.project)}</td><td class="num">${seconds(t.durationMs)}</td></tr>`,
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

  const qualityCards = [
    card("Line coverage", percent(latest.coverage?.lines), {
      tone: rate(latest.coverage?.lines, 90, 75),
      chart: trend((s) => s.coverage?.lines, "Line coverage", " %"),
    }),
    card("Branch coverage", percent(latest.coverage?.branches), {
      tone: rate(latest.coverage?.branches, 85, 70),
      chart: trend((s) => s.coverage?.branches, "Branch coverage", " %"),
    }),
    card("Mutation score", percent(latest.mutationScore), {
      tone: rate(latest.mutationScore, 80, 60),
      note: "Latest manual Stryker run",
      chart: trend((s) => s.mutationScore, "Mutation score", " %"),
    }),
    card("Type coverage", percent(latest.typeCoverage, 2), {
      tone: rate(latest.typeCoverage, 99.5, 98),
      note: "Gate at 99.5 %",
    }),
  ];

  const lh = latest.lighthouse;
  const bundle = latest.bundle ?? [];
  const perfCards = [
    card(
      "Lighthouse",
      lh
        ? `${lh.performance} · ${lh.accessibility} · ${lh.bestPractices} · ${lh.seo}`
        : "n/a",
      {
        tone: lh
          ? rate(
              Math.min(lh.performance, lh.accessibility, lh.bestPractices),
              90,
              70,
            )
          : "none",
        note: "Performance · accessibility · best practices · SEO, desktop preset",
        chart: trend(
          (s) => s.lighthouse?.performance,
          "Lighthouse performance",
        ),
      },
    ),
    card(
      "Largest contentful paint",
      lh?.lcpMs == null ? "n/a" : `${lh.lcpMs} ms`,
      {
        tone: under(lh?.lcpMs, 2500),
        note: "Budget 2500 ms",
        chart: trend(
          (s) => s.lighthouse?.lcpMs,
          "Largest contentful paint",
          " ms",
        ),
      },
    ),
    card("Total blocking time", lh?.tbtMs == null ? "n/a" : `${lh.tbtMs} ms`, {
      tone: under(lh?.tbtMs, 300),
      note: "Budget 300 ms",
    }),
    ...bundle.map((b) =>
      card(b.name, kb(b.bytes), {
        tone: b.limitBytes === null ? "none" : under(b.bytes, b.limitBytes),
        note: b.limitBytes === null ? undefined : `Ceiling ${kb(b.limitBytes)}`,
        chart: trend(
          (s) => s.bundle?.find((x) => x.name === b.name)?.bytes,
          b.name,
          " B",
        ),
      }),
    ),
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
    card("Eval pass rate", ev ? `${ev.passed} / ${ev.total}` : "n/a", {
      tone:
        ev && ev.total ? rate((ev.passed / ev.total) * 100, 80, 50) : "none",
      note: ev
        ? `${ev.model}, $${ev.costUsd.toFixed(3)}, ${ev.at.slice(0, 10)}`
        : "No eval run recorded yet",
      chart: trend(
        (s) =>
          s.evals && s.evals.total
            ? +((s.evals.passed / s.evals.total) * 100).toFixed(0)
            : null,
        "Eval pass rate",
        " %",
      ),
    }),
    card("Intents", intents.length ? `${intents.length}` : "n/a", {
      note: intents.length
        ? [...byStatus].map(([s, n]) => `${n} ${s}`).join(" · ")
        : "No intent folder",
    }),
    card(
      "Review findings",
      review ? `${totalFindings(review.findings)}` : "n/a",
      {
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
          ? bars(
              review.perPull.map((p) => p.total),
              "Findings per pull request",
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
        note: review
          ? `${review.resolved} of ${review.threads} reviewer threads resolved, by the fix loop or by hand`
          : "Share of reviewer threads resolved, by the fix loop or by hand",
      },
    ),
  ];

  const delivery = latest.delivery;
  const deliveryCards = [
    card("PR cycle time", hours(delivery?.medianCycleHours), {
      tone: under(delivery?.medianCycleHours, 48),
      note: "Median from opened to merged",
    }),
    card(
      "Merges per week",
      delivery ? `${delivery.mergesPerWeek.at(-1) ?? 0}` : "n/a",
      {
        note: "Last eight weeks",
        chart: delivery ? bars(delivery.mergesPerWeek, "Merges per week") : "",
      },
    ),
  ];

  const grid = (cards: string[]) => `<dl class="grid">${cards.join("")}</dl>`;
  const commit = latest.sha
    ? ` · <code>${escapeHtml(latest.sha.slice(0, 7))}</code>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>SprintScout engineering dashboard</title>
<style>
:root{--bg:#f6f2f9;--surface:#fff;--ink:#241d33;--muted:#6b6480;--border:#d9d2e4;--accent:#c2301f;--soft:#efe9f6;--gain:#087359;--loss:#9e5400;--poor:#b3261e;--gain-soft:#d6f5ec;--loss-soft:#ffe9cc;--poor-soft:#fde2df}
@media (prefers-color-scheme:dark){:root{--bg:#101d22;--surface:#1a2c32;--ink:#e8f1ef;--muted:#b5c7c8;--border:#2f454c;--accent:#ff8c84;--soft:#254440;--gain:#6df2c0;--loss:#ffd084;--poor:#ff8c84;--gain-soft:#1b3a33;--loss-soft:#3b2f18;--poor-soft:#3f2321}}
*{box-sizing:border-box}
body{font:15px/1.5 "DM Sans","Helvetica Neue",Arial,system-ui,sans-serif;margin:0;padding:24px 16px 48px;color:var(--ink);background:var(--bg)}
main{max-width:72rem;margin-inline:auto}
header{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;margin-bottom:8px}
h1{font:800 1.6rem/1.2 Outfit,"Avenir Next","DM Sans",sans-serif;margin:0}
h2{font:700 1.1rem/1.3 Outfit,"Avenir Next","DM Sans",sans-serif;margin:32px 0 2px}
.lead,.muted,.note{color:var(--muted)}.lead{margin:0 0 12px;font-size:.9rem}
nav{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.9rem;margin:8px 0 0}nav a{color:var(--accent);text-decoration:none}nav a:hover{text-decoration:underline}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:12px;margin:0}
.card{background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--border);border-radius:10px;padding:12px 14px;min-width:0}
.card[data-tone=good]{border-left-color:var(--gain)}.card[data-tone=watch]{border-left-color:var(--loss)}.card[data-tone=poor]{border-left-color:var(--poor)}
dt{font-size:.8rem;color:var(--muted)}dd{margin:0;font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.note{margin:2px 0 0;font-size:.8rem}
figure{margin:8px 0 0;color:var(--accent)}.spark{display:block;max-width:100%;height:auto}
table{border-collapse:collapse;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-top:12px}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--border);font-size:.9rem}tr:last-child td{border-bottom:0}.num{text-align:right;font-variant-numeric:tabular-nums}
code{font-size:.85em;background:var(--soft);padding:1px 5px;border-radius:4px}
.board{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:12px;align-items:start}
.column{background:var(--soft);border-radius:10px;padding:10px;min-width:0}.column h3{margin:0 0 8px;font-size:.95rem}
.board ul,.dropped ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.intent{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;overflow-wrap:anywhere}
.intent a{color:var(--ink)}[data-checks=failing]{color:var(--poor)}[data-checks=passing]{color:var(--gain)}
.dropped{margin-top:12px}.dropped summary{cursor:pointer;color:var(--muted)}
footer{margin-top:40px;font-size:.85rem;color:var(--muted)}
.bands{margin-top:16px;border-radius:10px;padding:10px 14px;background:var(--surface);border:1px solid var(--border)}
p.bands{font-size:.9rem;color:var(--muted)}
.bands[data-level="2"]{border-color:var(--loss);background:var(--loss-soft)}.bands[data-level="3"]{border-color:var(--poor);background:var(--poor-soft)}
.bands h2{margin:0 0 2px}.bands ul{margin:4px 0 0;padding-left:20px}.bands li{margin:2px 0}
</style>
</head>
<body>
<main>
<header><h1>SprintScout engineering dashboard</h1><p class="muted">Run on main of ${escapeHtml(latest.date)}${commit} · ${history.length} run${history.length === 1 ? "" : "s"} recorded</p></header>
<nav aria-label="Sections"><a href="#pipeline">Pipeline</a><a href="#tests">Tests</a><a href="#quality">Quality gates</a><a href="#performance">Performance</a><a href="#ai">AI practice</a><a href="#delivery">Delivery</a></nav>
${bandsPanel(annotations)}
${section("pipeline", "Pipeline", "The Checks workflow on main: static gates, unit, component, end-to-end, database, deploy gate.", grid(pipelineCards))}
${section("tests", "Tests", "Counts per level from the latest run; trend over the recorded runs.", grid(testCards) + `<table><caption class="muted">Slowest ten end-to-end tests</caption><thead><tr><th>Test</th><th>Project</th><th class="num">Duration</th></tr></thead><tbody>${slowest || '<tr><td colspan="3" class="muted">No end-to-end report</td></tr>'}</tbody></table>`)}
${section("quality", "Quality gates", "Coverage from the merged unit shards, mutation score from the last manual Stryker run, type coverage from the static gate.", grid(qualityCards))}
${section("performance", "Performance", "The deploy gate runs Lighthouse against the static export and checks client JavaScript against its ceiling.", grid(perfCards))}
${section("ai", "AI practice", "Evals prove the agent configuration steers an agent; intents are the audit trail of work asked for and delivered.", grid(aiCards))}
${section("board", "Intent board", "Intents on main and on open pull requests, as they stood when this dashboard was built.", boardHtml(latest.board ?? []))}
${section("delivery", "Delivery", "Pull requests merged into main, read from the GitHub API by the dashboard job.", grid(deliveryCards))}
<footer>Built by the Checks workflow after every push to main. No scripts, no external requests. Source: <code>packages/testing/src/dashboard.ts</code>.</footer>
</main>
</body>
</html>
`;
}
