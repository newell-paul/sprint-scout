import { describe, expect, it } from "vitest";
import {
  bandsMarkdown,
  evaluateBand,
  evaluateBands,
  pick,
  stats,
  worstLevel,
  type BandConfig,
} from "./bands";
import type { Snapshot } from "./dashboard";

const run = (
  date: string,
  durationMs: number,
  extra: Partial<Snapshot> = {},
): Snapshot => ({
  date,
  e2e: { tests: 127, failed: 0, durationMs, slowest: [] },
  coverage: { lines: 90, branches: 85 },
  mutationScore: 80,
  ...extra,
});
const steady = Array.from({ length: 10 }, (_, i) =>
  run(`2026-10-${String(i + 1).padStart(2, "0")}`, 40_000 + (i % 2) * 2000),
);
const duration: BandConfig = {
  id: "e2e-duration",
  label: "End-to-end duration",
  path: "e2e.durationMs",
  worse: "higher",
  unit: "ms",
};

describe("pick", () => {
  it("reads dotted paths, array indexes and the derived eval rate", () => {
    const s = run("2026-10-01", 1, {
      bundle: [{ name: "js", bytes: 474_000, limitBytes: 550_000 }],
      evals: { at: "", model: "m", passed: 4, total: 5, costUsd: 0 },
    });
    expect(pick(s, "e2e.durationMs")).toBe(1);
    expect(pick(s, "bundle.0.bytes")).toBe(474_000);
    expect(pick(s, "evals.rate")).toBe(80);
    expect(pick(s, "lighthouse.performance")).toBeNull();
    expect(pick(s, "e2e.slowest")).toBeNull();
  });
});

describe("stats", () => {
  it("uses the sample standard deviation", () => {
    expect(stats([2, 4, 4, 4, 5, 5, 7, 9])).toEqual({
      mean: 5,
      sigma: Math.sqrt(32 / 7),
    });
    expect(stats([3]).sigma).toBe(0);
  });
});

describe("evaluateBand", () => {
  it("is level 0 inside the band and reports the baseline size", () => {
    const result = evaluateBand(
      [...steady, run("2026-10-11", 41_000)],
      duration,
    );
    expect(result.level).toBe(0);
    expect(result.runs).toBe(10);
    expect(result.mean).toBe(41_000);
    expect(result.reason).toContain("within");
  });

  it("escalates by standard deviations in the worse direction only", () => {
    const sigma = stats(steady.map((s) => s.e2e!.durationMs)).sigma;
    const at = (k: number) =>
      evaluateBand(
        [...steady, run("2026-10-11", 41_000 + k * sigma)],
        duration,
      );
    expect(at(1.5).level).toBe(1);
    expect(at(2.5).level).toBe(2);
    expect(at(3.5).level).toBe(3);
    expect(at(3.5).reason).toMatch(/3\.5 σ above the 10-run mean 41000 ms/);
    expect(at(-5).level).toBe(0);
    expect(at(-5).reason).toContain("better side");
  });

  it("treats lower as worse when asked", () => {
    const coverage: BandConfig = {
      id: "lines",
      label: "Line coverage",
      path: "coverage.lines",
      worse: "lower",
      unit: "%",
      minSigma: 0.5,
    };
    const drop = evaluateBand(
      [
        ...steady,
        run("2026-10-11", 40_000, { coverage: { lines: 85, branches: 85 } }),
      ],
      coverage,
    );
    expect(drop.level).toBe(3);
    expect(drop.reason).toContain("below");
    const rise = evaluateBand(
      [
        ...steady,
        run("2026-10-11", 40_000, { coverage: { lines: 95, branches: 85 } }),
      ],
      coverage,
    );
    expect(rise.level).toBe(0);
  });

  it("applies a minimum sigma so a flat baseline does not alarm on noise", () => {
    const flat = steady.map((s) => run(s.date, 40_000));
    const strict = evaluateBand([...flat, run("2026-10-11", 40_001)], duration);
    expect(strict.level).toBe(3);
    expect(strict.reason).toContain("far σ");
    const tolerant = evaluateBand([...flat, run("2026-10-11", 40_001)], {
      ...duration,
      minSigma: 2000,
    });
    expect(tolerant.level).toBe(0);
  });

  it("waits for enough runs and skips a missing value", () => {
    const young = evaluateBand(steady.slice(0, 4), duration);
    expect(young.level).toBe(0);
    expect(young.reason).toBe("baseline needs 5 runs, has 3");
    const missing = evaluateBand(
      [...steady, run("2026-10-11", 40_000, { e2e: null })],
      duration,
    );
    expect(missing.level).toBe(0);
    expect(missing.reason).toBe("no value in the latest run");
    expect(evaluateBand([], duration).value).toBeNull();
  });

  it("limits the baseline to the window of previous runs", () => {
    const result = evaluateBand([...steady, run("2026-10-11", 41_000)], {
      ...duration,
      window: 4,
    });
    expect(result.runs).toBe(4);
  });
});

describe("evaluateBands", () => {
  it("evaluates every configured band and summarises in Markdown", () => {
    const history = [...steady, run("2026-10-11", 60_000)];
    const results = evaluateBands(history, {
      bands: [
        duration,
        {
          id: "e2e-count",
          label: "End-to-end tests",
          path: "e2e.tests",
          worse: "lower",
          minSigma: 1,
        },
      ],
    });
    expect(results.map((r) => r.level)).toEqual([3, 0]);
    expect(worstLevel(results)).toBe(3);
    const md = bandsMarkdown(results);
    expect(md).toContain("| End-to-end duration | 60000 | 41000 | 3σ |");
    expect(md).toContain("the dashboard job fails");
    expect(bandsMarkdown(results.slice(1))).toContain(
      "Every metric is within its bands.",
    );
    expect(worstLevel([])).toBe(0);
  });
});
