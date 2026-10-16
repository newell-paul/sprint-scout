import { describe, expect, it } from "vitest";
import {
  appendHistory,
  badges,
  bars,
  deliverySummary,
  flakeFreeStreak,
  intentSummary,
  lighthouseSummary,
  mutationScore,
  pipelineSummary,
  render,
  snapshot,
  sparkline,
  summariseVitest,
  type Snapshot,
} from "./dashboard";

const playwright = {
  stats: { startTime: "2026-09-14T02:17:00.000Z", duration: 41_000 },
  suites: [
    {
      title: "e2e/board.spec.ts",
      file: "e2e/board.spec.ts",
      specs: [
        {
          title: "ranking puts the gain first",
          file: "e2e/board.spec.ts",
          tests: [
            {
              projectName: "chromium-desktop",
              results: [{ status: "passed", duration: 1500 }],
            },
          ],
        },
        {
          title: "a stale forecast is refetched",
          file: "e2e/board.spec.ts",
          tests: [
            {
              projectName: "chromium-desktop",
              results: [{ status: "failed", duration: 8200 }],
            },
          ],
        },
      ],
    },
  ],
};
const mutation = {
  files: {
    "wind.ts": {
      mutants: [
        { status: "Killed" },
        { status: "Timeout" },
        { status: "Survived" },
        { status: "NoCoverage" },
        { status: "Ignored" },
        { status: "CompileError" },
      ],
    },
  },
};
const vitest = {
  numTotalTests: 377,
  numFailedTests: 0,
  testResults: [
    { startTime: 1000, endTime: 4000 },
    { startTime: 2000, endTime: 9000 },
  ],
};
const manifest = [
  {
    isRepresentativeRun: false,
    jsonPath: "/ci/a.json",
    summary: {
      performance: 0.5,
      accessibility: 1,
      "best-practices": 1,
      seo: 0.9,
    },
  },
  {
    isRepresentativeRun: true,
    jsonPath: "/ci/b.json",
    summary: {
      performance: 0.97,
      accessibility: 1,
      "best-practices": 1,
      seo: 0.9,
    },
  },
];
const lhr = {
  categories: {
    performance: { score: 0.966 },
    accessibility: { score: 1 },
    "best-practices": { score: 1 },
    seo: { score: 0.9 },
  },
  audits: {
    "largest-contentful-paint": { numericValue: 663.5 },
    "total-blocking-time": { numericValue: 0 },
  },
};
const runs = [
  {
    conclusion: "success",
    createdAt: "2026-10-10T10:00:00Z",
    updatedAt: "2026-10-10T10:08:30Z",
    attempt: 1,
  },
  {
    conclusion: "success",
    createdAt: "2026-10-09T10:00:00Z",
    updatedAt: "2026-10-09T10:07:00Z",
    attempt: 2,
  },
  {
    conclusion: "failure",
    createdAt: "2026-10-08T10:00:00Z",
    updatedAt: "2026-10-08T10:03:00Z",
    attempt: 1,
  },
  {
    conclusion: null,
    createdAt: "2026-10-11T10:00:00Z",
    updatedAt: "2026-10-11T10:00:00Z",
  },
];
const pulls = [
  { createdAt: "2026-10-01T09:00:00Z", mergedAt: "2026-10-01T15:00:00Z" },
  { createdAt: "2026-10-05T09:00:00Z", mergedAt: "2026-10-06T09:00:00Z" },
  { createdAt: "2026-09-01T09:00:00Z", mergedAt: "2026-09-01T10:00:00Z" },
  { createdAt: "2026-10-09T09:00:00Z", mergedAt: null },
];
const intents = [
  {
    slug: "evals",
    text: "# Evals\n\nStatus: done\nOpened: 10 October 2026 by the owner\n",
  },
  {
    slug: "dashboard",
    text: "# Dashboard\n\nStatus: in build\nOpened: 10 October 2026 by the owner\n",
  },
];
const everything = {
  date: "2026-10-10",
  sha: "0123456789abcdef",
  playwright,
  unit: vitest,
  component: { ...vitest, numTotalTests: 45 },
  coverage: {
    total: {
      lines: { pct: 91.2 },
      branches: { pct: 84.5 },
      statements: { pct: 90 },
    },
  },
  mutation,
  typeCoverage: { percent: 99.64, percentString: "99.64" },
  lighthouse: { manifest, results: { "/ci/b.json": lhr } },
  size: [
    {
      name: "planner client JavaScript, gzip",
      size: 474_711,
      sizeLimit: 550_000,
    },
  ],
  evals: {
    at: "2026-10-10T08:00:00Z",
    model: "claude-haiku-5-5",
    passed: 5,
    total: 5,
    costUsd: 0.038,
  },
  runs,
  pulls,
  intents,
  now: "2026-10-10T12:00:00Z",
};

const retried = {
  ...playwright,
  suites: [
    {
      ...playwright.suites[0]!,
      specs: [
        {
          title: "a saved segment opens at the first hour",
          file: "e2e/forecast.spec.ts",
          tests: [
            {
              projectName: "webkit-a11y",
              results: [
                { status: "failed", duration: 9000 },
                { status: "passed", duration: 1200 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("snapshot", () => {
  // Checks pass when a retry passes, so the dashboard must not call it red.
  it("counts a test that passed on retry as flaky, not failed", () => {
    expect(
      snapshot({ date: "2026-10-16", playwright: retried }).e2e,
    ).toMatchObject({
      tests: 1,
      failed: 0,
      flaky: 1,
    });
  });

  it("summarises every report", () => {
    const result = snapshot(everything);
    expect(result.e2e).toEqual({
      tests: 2,
      failed: 1,
      flaky: 0,
      durationMs: 41_000,
      slowest: [
        {
          title: "a stale forecast is refetched",
          project: "chromium-desktop",
          durationMs: 8200,
        },
        {
          title: "ranking puts the gain first",
          project: "chromium-desktop",
          durationMs: 1500,
        },
      ],
    });
    expect(result.unit).toEqual({ tests: 377, failed: 0, durationMs: 8000 });
    expect(result.component?.tests).toBe(45);
    expect(result.coverage).toEqual({ lines: 91.2, branches: 84.5 });
    expect(result.mutationScore).toBe(50);
    expect(result.typeCoverage).toBe(99.64);
    expect(result.lighthouse).toEqual({
      performance: 97,
      accessibility: 100,
      bestPractices: 100,
      seo: 90,
      lcpMs: 664,
      tbtMs: 0,
    });
    expect(result.bundle).toEqual([
      {
        name: "planner client JavaScript, gzip",
        bytes: 474_711,
        limitBytes: 550_000,
      },
    ]);
    expect(result.evals?.passed).toBe(5);
    expect(result.pipeline).toEqual({
      durationMs: 510_000,
      firstPassRate: (1 / 3) * 100,
    });
    expect(result.delivery?.medianCycleHours).toBe(6);
    expect(result.intents?.map((i) => i.slug)).toEqual(["dashboard", "evals"]);
    expect(result.sha).toBe("0123456789abcdef");
  });

  it("leaves every metric empty when its report is missing", () => {
    expect(snapshot({ date: "2026-09-14" })).toEqual({
      date: "2026-09-14",
      e2e: null,
      coverage: null,
      mutationScore: null,
    });
  });

  it("scores mutation as detected over counted, ignoring what Stryker ignores", () => {
    expect(mutationScore(mutation)).toBe(50);
    expect(mutationScore({ files: {} })).toBeNull();
  });

  it("measures a Vitest run from first start to last end", () => {
    expect(summariseVitest(vitest).durationMs).toBe(8000);
    expect(summariseVitest({ ...vitest, testResults: [] }).durationMs).toBe(0);
  });

  it("prefers the representative Lighthouse run and falls back to the manifest summary", () => {
    expect(lighthouseSummary(manifest, {})).toEqual({
      performance: 97,
      accessibility: 100,
      bestPractices: 100,
      seo: 90,
      lcpMs: null,
      tbtMs: null,
    });
    expect(lighthouseSummary([], {})).toBeNull();
  });

  it("rates the pipeline on completed runs only, first attempt successes", () => {
    expect(pipelineSummary(runs)).toEqual({
      durationMs: 510_000,
      firstPassRate: (1 / 3) * 100,
    });
    expect(pipelineSummary([])).toEqual({
      durationMs: null,
      firstPassRate: null,
    });
  });

  it("takes the median cycle time and buckets merges by week ending now", () => {
    const result = deliverySummary(pulls, "2026-10-10T12:00:00Z", 8);
    expect(result.medianCycleHours).toBe(6);
    expect(result.mergesPerWeek).toHaveLength(8);
    expect(result.mergesPerWeek.slice(-2)).toEqual([1, 1]);
    expect(result.mergesPerWeek.reduce((a, b) => a + b, 0)).toBe(3);
    expect(
      deliverySummary([], "2026-10-10T12:00:00Z").medianCycleHours,
    ).toBeNull();
  });

  it("reads intent status and opened date, sorted by slug", () => {
    expect(intentSummary(intents)).toEqual([
      { slug: "dashboard", status: "in build", opened: "10 October 2026" },
      { slug: "evals", status: "done", opened: "10 October 2026" },
    ]);
    expect(intentSummary([{ slug: "x", text: "# X\n" }])[0]).toEqual({
      slug: "x",
      status: "unknown",
      opened: "",
    });
  });
});

describe("history", () => {
  const day = (date: string): Snapshot => ({
    ...snapshot({ date }),
    mutationScore: 0,
  });

  it("replaces a same-day run, keeps chronological order and trims to the window", () => {
    const history = appendHistory(
      [day("2026-09-13"), day("2026-09-11")],
      { ...day("2026-09-13"), mutationScore: 50 },
      2,
    );
    expect(history.map((s) => [s.date, s.mutationScore])).toEqual([
      ["2026-09-11", 0],
      ["2026-09-13", 50],
    ]);
  });

  it("counts the flake-free streak back from the latest run", () => {
    const green = snapshot({
      date: "2026-10-02",
      playwright: {
        ...playwright,
        suites: [
          {
            ...playwright.suites[0]!,
            specs: [playwright.suites[0]!.specs[0]!],
          },
        ],
      },
    });
    const red = snapshot({ date: "2026-10-01", playwright });
    expect(
      flakeFreeStreak([red, green, { ...green, date: "2026-10-03" }]),
    ).toBe(2);
    expect(flakeFreeStreak([green, red])).toBe(0);
    expect(
      flakeFreeStreak([
        green,
        snapshot({ date: "2026-10-04", playwright: retried }),
      ]),
    ).toBe(0);
    expect(flakeFreeStreak([])).toBe(0);
  });
});

describe("charts", () => {
  it("draws a sparkline only with two or more points and labels its range", () => {
    expect(sparkline([1, null, 3], "coverage", " %")).toContain(
      'aria-label="coverage over the last 2 runs, from 1 % to 3 %"',
    );
    expect(sparkline([null, 5], "x")).toBe("");
  });

  it("draws one bar per value", () => {
    expect(bars([0, 2, 1], "merges").match(/<rect/g)).toHaveLength(3);
    expect(bars([], "merges")).toBe("");
  });
});

describe("badges", () => {
  it("writes shields endpoint JSON with a colour per threshold", () => {
    const result = badges(snapshot(everything));
    expect(result.evals).toEqual({
      schemaVersion: 1,
      label: "evals",
      message: "5/5 pass",
      color: "brightgreen",
    });
    expect(result.mutation?.color).toBe("red");
    expect(result.coverage?.message).toBe("91 % lines");
    expect(result.lighthouse?.message).toBe("97 · 100 · 100");
    expect(result.e2e?.color).toBe("red");
  });

  it("passes the e2e badge with a flaky note when a retry passed", () => {
    expect(
      badges(snapshot({ date: "2026-10-16", playwright: retried })).e2e,
    ).toMatchObject({ message: "1/1 pass · 1 flaky", color: "yellow" });
  });

  it("falls back to grey n/a badges", () => {
    for (const badge of Object.values(badges(undefined))) {
      expect(badge).toMatchObject({
        schemaVersion: 1,
        message: "n/a",
        color: "lightgrey",
      });
    }
    expect(badges(snapshot({ date: "2026-10-10" })).evals?.message).toBe("n/a");
  });
});

describe("render", () => {
  it("shows every section with the latest metrics and escapes test titles", () => {
    const first = snapshot({ date: "2026-10-09", playwright });
    const latest = snapshot({
      ...everything,
      playwright: {
        ...playwright,
        suites: [
          {
            ...playwright.suites[0]!,
            specs: [
              {
                ...playwright.suites[0]!.specs[0]!,
                title: "a <b>bold</b> title",
              },
            ],
          },
        ],
      },
    });
    const html = render([first, latest]);
    expect(html).toContain("Run on main of 2026-10-10");
    expect(html).toContain("<code>0123456</code>");
    for (const id of [
      "pipeline",
      "tests",
      "quality",
      "performance",
      "ai",
      "delivery",
    ]) {
      expect(html).toContain(`<section id="${id}"`);
    }
    expect(html).toContain("1 / 1 passed");
    expect(html).toContain("377 / 377 passed");
    expect(html).toContain("97 · 100 · 100 · 90");
    expect(html).toContain("475 kB");
    expect(html).toContain("5 / 5");
    expect(html).toContain("<code>dashboard</code>");
    expect(html).toContain("a &lt;b&gt;bold&lt;/b&gt; title");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain(
      'aria-label="End-to-end duration over the last 2 runs',
    );
    expect(html).toContain("Not collected yet");
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain("prefers-color-scheme:dark");
  });

  it("shows review findings and the resolved share once reviews are collected", () => {
    const base = {
      sha: "abc",
      run: 1,
      model: "claude-sonnet-5-5",
      at: "2026-10-10T09:00:00Z",
      inline: 1,
      verdict: "",
    };
    const latest = snapshot({
      date: "2026-10-10",
      reviews: [
        {
          ...base,
          pr: 1,
          findings: { blocker: 0, major: 1, minor: 2, nit: 0 },
          threads: 3,
          resolved: 2,
        },
        {
          ...base,
          pr: 2,
          findings: { blocker: 0, major: 0, minor: 1, nit: 1 },
          threads: 1,
          resolved: 1,
        },
      ],
    });
    expect(latest.review).toEqual({
      findings: { blocker: 0, major: 1, minor: 3, nit: 1 },
      pulls: 2,
      perPull: [
        { pr: 1, total: 3 },
        { pr: 2, total: 2 },
      ],
      threads: 4,
      resolved: 3,
      resolvedShare: 75,
    });
    const html = render([latest]);
    expect(html).toContain(
      "0 blocker · 1 major · 3 minor · 1 nit over 2 pull requests",
    );
    expect(html).toContain('aria-label="Findings per pull request: 3, 2"');
    expect(html).toContain("75 %");
    expect(html).toContain("3 of 4 reviewer threads resolved");
    expect(html).not.toContain("Not collected yet");
  });

  it("renders an old history entry without the new fields", () => {
    const old = {
      date: "2026-09-14",
      e2e: null,
      coverage: null,
      mutationScore: 42,
    } as Snapshot;
    const html = render([old]);
    expect(html).toContain("42.0 %");
    expect(html).toContain("No unit report");
    expect(html).toContain("No eval run recorded yet");
    expect(html).toContain("Client JavaScript");
  });

  it("shows band annotations at 2σ and above, escaped", () => {
    const history = [snapshot({ date: "2026-10-10", playwright })];
    const quiet = render(history, [
      { label: "x", level: 1, reason: "logged only" },
    ]);
    expect(quiet).toContain("every metric is within");
    expect(quiet).not.toContain("logged only");
    const loud = render(history, [
      { label: "a <b>", level: 2, reason: "drifted" },
      { label: "b", level: 3, reason: "broke & failed" },
    ]);
    expect(loud).toContain('class="bands" data-level="3"');
    expect(loud).toContain("<strong>a &lt;b&gt;</strong>: drifted");
    expect(loud).toContain("broke &amp; failed");
    expect(render(history)).not.toContain('class="bands"');
  });

  it("explains an empty history", () => {
    expect(render([])).toContain("No test runs recorded yet.");
  });
});
