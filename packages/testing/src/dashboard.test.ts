import { describe, expect, it } from "vitest";
import {
  appendHistory,
  badges,
  checkState,
  columns,
  deliverySummary,
  flakeFreeStreak,
  intentBoard,
  intentSummary,
  lighthouseSummary,
  meter,
  mutationScore,
  pipelineSummary,
  refreshBoard,
  render,
  ring,
  snapshot,
  sparkline,
  summariseVitest,
  type OpenIntent,
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

  it("fills under a sparkline only when given an area id, and names what it spans", () => {
    const filled = sparkline([2, 3], "Review findings", "", {
      area: "f",
      over: "pull requests",
    });
    expect(filled).toContain('fill="url(#f)"');
    expect(filled).toContain(
      'aria-label="Review findings over the last 2 pull requests, from 2 to 3"',
    );
    expect(sparkline([2, 3], "x")).not.toContain("url(#");
  });

  it("draws a ring whose dash is the percentage, clamped, with its tone", () => {
    expect(ring(0.92, "good", "Line coverage")).toContain(
      'stroke-dasharray="92.0 100"',
    );
    expect(ring(1.4, "good", "x")).toContain('stroke-dasharray="100.0 100"');
    expect(ring(0.5, "watch", "SEO 90", "90")).toMatch(
      /data-tone="watch" role="img" aria-label="SEO 90">.*<text[^>]*>90<\/text>/,
    );
    expect(ring(null, "none", "x")).toBe("");
  });

  it("fills a meter against its scale and marks a ceiling", () => {
    const html = meter(445, 605, "good", "bundle", 550);
    expect(html).toContain('style="width:73.6%"');
    expect(html).toContain('class="mark" style="left:90.9%"');
    expect(meter(900, 300, "poor", "tbt")).toContain('style="width:100.0%"');
    expect(meter(undefined, 300, "none", "tbt")).toBe("");
  });

  it("draws one column per week and lights the newest", () => {
    const html = columns([3, 0, 7], ["−2w", "−1w", "This wk"], "Merges");
    expect(html.match(/<path/g)).toHaveLength(3);
    expect(html.match(/class="now"/g)).toHaveLength(1);
    expect(html).toContain(">This wk</text>");
    expect(html).toContain('aria-label="Merges: 3, 0, 7"');
    expect(columns([], [], "Merges")).toBe("");
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
      "board",
      "quality",
      "performance",
      "ai",
      "delivery",
      "slowest",
    ]) {
      expect(html).toContain(`<section id="${id}"`);
    }
    const order = [...html.matchAll(/<section id="([a-z]+)"/g)].map(
      (m) => m[1],
    );
    expect(order).toEqual([
      "pipeline",
      "tests",
      "board",
      "quality",
      "performance",
      "ai",
      "delivery",
      "slowest",
    ]);
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
    // The page loads nothing external; the board's GitHub links are the only URLs.
    expect(
      html.replace(/<a href="https:\/\/github\.com\/[^"]*">/g, ""),
    ).not.toMatch(/https?:\/\//);
    expect(html).toContain('<meta name="color-scheme" content="dark">');
    expect(html).toContain('aria-label="Performance 97"');
    expect(html).toMatch(/data-tone="watch" role="img" aria-label="SEO 90"/);
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
    expect(html).toContain(
      'aria-label="Review findings over the last 2 pull requests, from 2 to 3"',
    );
    expect(html).toContain("75 %");
    expect(html).toContain("3 of 4 reviewer threads resolved");
    expect(html).not.toContain("Not collected yet");
  });

  it("carries the planner's logo and fonts from its own origin", () => {
    const html = render([snapshot({ date: "2026-10-24" })]);
    expect(html).toContain('url("fonts/inter-latin-variable.woff2")');
    expect(html).toContain('url("fonts/jetbrains-mono-latin-variable.woff2")');
    expect(html).toMatch(
      /<a class="brand" href="\.\.\/" aria-label="SprintScout planner"><svg[^>]*aria-hidden="true"/,
    );
    expect(html.match(/<style>[\s\S]*<\/style>/)![0]).not.toMatch(/https?:/);
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

const intentText = (title: string, status: string, opened = "1 October 2026") =>
  `# ${title}\n\nStatus: ${status}\nOpened: ${opened} by the owner\n`;
const pr = (
  number: number,
  statusCheckRollup: OpenIntent["pr"]["statusCheckRollup"] = [],
  isDraft = false,
) => ({
  number,
  url: `https://github.com/o/r/pull/${number}`,
  isDraft,
  headRefName: `branch-${number}`,
  statusCheckRollup,
});
const passed = { status: "COMPLETED", conclusion: "SUCCESS" };

describe("intent board", () => {
  it("reads the check state, failing first, then running, then passing", () => {
    expect(checkState([])).toBe("no checks");
    expect(
      checkState([passed, { status: "COMPLETED", conclusion: "SKIPPED" }]),
    ).toBe("passing");
    expect(
      checkState([passed, { status: "IN_PROGRESS", conclusion: null }]),
    ).toBe("running");
    expect(checkState([passed, { state: "PENDING" }])).toBe("running");
    expect(
      checkState([
        { status: "IN_PROGRESS", conclusion: null },
        { status: "COMPLETED", conclusion: "TIMED_OUT" },
      ]),
    ).toBe("failing");
    expect(checkState([passed, { state: "ERROR" }])).toBe("failing");
    expect(checkState([{ state: "SUCCESS" }])).toBe("passing");
  });

  it("places intents on main by their status line", () => {
    const board = intentBoard(
      [
        { slug: "a", text: intentText("A", "draft") },
        { slug: "b", text: intentText("B", "Accepted") },
        { slug: "c", text: intentText("C", "in build") },
        { slug: "d", text: intentText("D", "done") },
        { slug: "e", text: intentText("E", "dropped") },
        { slug: "f", text: "# F\n" },
      ],
      [],
      "o/r",
    );
    expect(Object.fromEntries(board.map((c) => [c.slug, c.column]))).toEqual({
      a: "Draft",
      b: "Accepted",
      c: "In build",
      d: "Done",
      e: "Dropped",
      f: "Draft",
    });
  });

  it("moves an open pull request's intent to In build once it has a plan", () => {
    const open = (slug: string, status: string, plan: boolean): OpenIntent => ({
      slug,
      text: intentText(slug, status),
      spec: plan,
      plan,
      pr: pr(1),
    });
    const board = intentBoard(
      [],
      [
        open("draft-no-plan", "draft", false),
        open("draft-plan", "draft", true),
        open("accepted-no-plan", "accepted", false),
        open("accepted-plan", "accepted", true),
        open("done-on-branch", "done", true),
        open("dropped", "dropped", true),
      ],
      "o/r",
    );
    expect(Object.fromEntries(board.map((c) => [c.slug, c.column]))).toEqual({
      "draft-no-plan": "Draft",
      "draft-plan": "In build",
      "accepted-no-plan": "Accepted",
      "accepted-plan": "In build",
      "done-on-branch": "In build",
      dropped: "Dropped",
    });
  });

  it("lets the branch copy replace main, the highest pull request winning", () => {
    const board = intentBoard(
      [
        {
          slug: "x",
          text: intentText("Old title", "done"),
          spec: true,
          plan: true,
        },
      ],
      [
        { slug: "x", text: intentText("From 7", "accepted"), pr: pr(7) },
        {
          slug: "x",
          text: intentText("From 9", "accepted"),
          spec: true,
          pr: pr(9, [passed], true),
        },
      ],
      "o/r",
    );
    expect(board).toEqual([
      {
        slug: "x",
        title: "From 9",
        opened: "1 October 2026",
        column: "Accepted",
        spec: true,
        plan: false,
        folder: "https://github.com/o/r/tree/branch-9/intent/x",
        pr: {
          number: 9,
          url: "https://github.com/o/r/pull/9",
          draft: true,
          checks: "passing",
        },
      },
    ]);
  });

  it("falls back to the slug for the title and links main folders", () => {
    const [card] = intentBoard(
      [{ slug: "bare", text: "Status: done\n" }],
      [],
      "o/r",
    );
    expect(card).toEqual({
      slug: "bare",
      title: "bare",
      opened: "",
      column: "Done",
      spec: false,
      plan: false,
      folder: "https://github.com/o/r/tree/main/intent/bare",
    });
  });

  it("sorts newest opened first, then by slug, undated last", () => {
    const board = intentBoard(
      [
        { slug: "undated", text: "# U\nStatus: done\n" },
        { slug: "b", text: intentText("B", "done", "2 October 2026") },
        { slug: "a", text: intentText("A", "done", "2 October 2026") },
        { slug: "c", text: intentText("C", "done", "30 September 2026") },
        { slug: "d", text: intentText("D", "done", "1 November 2026") },
      ],
      [],
      "o/r",
    );
    expect(board.map((c) => c.slug)).toEqual(["d", "a", "b", "c", "undated"]);
  });

  it("keeps the board on the newest history entry only", () => {
    const at = (date: string) =>
      snapshot({
        date,
        intents: [{ slug: "a", text: intentText("A", "done") }],
        openIntents: [],
        repo: "o/r",
      });
    const first = at("2026-10-01");
    expect(first.board).toHaveLength(1);
    const history = appendHistory(appendHistory([], first), at("2026-10-02"));
    expect(history.map((s) => s.board?.length)).toEqual([undefined, 1]);
  });

  it("renders the columns, cards and folded dropped intents", () => {
    const latest = snapshot({
      date: "2026-10-10",
      intents: [
        {
          slug: "shipped",
          text: intentText("Shipped <it>", "done"),
          spec: true,
          plan: true,
        },
        { slug: "gone", text: intentText("Gone", "dropped") },
      ],
      openIntents: [
        {
          slug: "wip",
          text: intentText("Work in progress", "accepted"),
          spec: true,
          plan: true,
          pr: pr(32, [{ status: "COMPLETED", conclusion: "FAILURE" }], true),
        },
      ],
      repo: "o/r",
    });
    const html = render([latest]);
    const board = html.slice(html.indexOf('<section id="board"'));
    const headings = [...board.matchAll(/<h3>([^<]+)/g)].map((m) =>
      m[1]!.trim(),
    );
    expect(headings.slice(0, 4)).toEqual([
      "Draft",
      "Accepted",
      "In build",
      "Done",
    ]);
    expect(board).toContain('<p class="ghost">Nothing here</p>');
    expect(board).toContain("Shipped &lt;it&gt;");
    expect(board).toContain(
      'href="https://github.com/o/r/tree/main/intent/shipped"',
    );
    expect(board).toContain(
      'href="https://github.com/o/r/tree/branch-32/intent/wip"',
    );
    expect(board).toContain(
      '<a class="pr" data-checks="failing" href="https://github.com/o/r/pull/32">#32 draft · failing</a>',
    );
    expect(board).toContain("Spec and plan");
    expect(board).toContain("No spec or plan");
    expect(board).toContain("<summary>Dropped (1)</summary>");
    expect(html).not.toContain(">Intents</caption>");
  });

  it("shows the newest five cards in a column and folds the rest", () => {
    const done = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        slug: `s${i}`,
        text: intentText(`Intent ${i}`, "done", `${i + 1} October 2026`),
      }));
    const html = render([snapshot({ date: "2026-10-10", intents: done(8) })]);
    const board = html.slice(html.indexOf('<section id="board"'));
    const shown = board.slice(0, board.indexOf("<details"));
    expect(shown).toContain("Intent 7");
    expect(shown).toContain("Intent 3");
    expect(shown).not.toContain("Intent 2<");
    expect(board).toContain("<summary>+ Show 3 more</summary>");
    expect(board.slice(board.indexOf("Show 3 more"))).toContain("Intent 0");

    const five = render([snapshot({ date: "2026-10-10", intents: done(5) })]);
    expect(five).not.toContain("more</summary>");
  });

  it("refreshes the board on the newest entry only", () => {
    const first = snapshot({ date: "2026-10-01", intents: [] });
    const latest = snapshot({
      date: "2026-10-02",
      intents: [{ slug: "a", text: intentText("A", "done") }],
      repo: "o/r",
    });
    const board = intentBoard(
      [{ slug: "b", text: intentText("B", "draft") }],
      [],
      "o/r",
    );

    const refreshed = refreshBoard([first, latest], board, "2026-10-05");

    expect(refreshed[0]).toBe(first);
    expect(refreshed[1]).toEqual({ ...latest, board, boardAt: "2026-10-05" });
    expect(latest.boardAt).toBe("2026-10-02");
    expect(refreshBoard([], board, "2026-10-05")).toEqual([]);
  });

  it("dates the board and links to the rebuild workflow", () => {
    const latest = snapshot({
      date: "2026-10-02",
      intents: [{ slug: "a", text: intentText("A", "done") }],
      repo: "o/r",
    });
    const built = render([latest]);
    expect(built).toContain(
      'Built on 2026-10-02. <a href="https://github.com/o/r/actions/workflows/pages.yml">Rebuild now</a>',
    );
    const refreshed = render(
      refreshBoard([latest], latest.board!, "2026-10-05"),
    );
    expect(refreshed).toContain("Built on 2026-10-05.");
  });

  it("omits the dropped fold when nothing is dropped and says when there are no intents", () => {
    const some = render([
      snapshot({
        date: "2026-10-10",
        intents: [{ slug: "a", text: intentText("A", "done") }],
      }),
    ]);
    expect(some).toContain('<section id="board"');
    expect(some).not.toContain("<summary>Dropped");
    const none = render([snapshot({ date: "2026-10-10", intents: [] })]);
    expect(none.slice(none.indexOf('<section id="board"'))).toContain(
      "No intents",
    );
  });
});
