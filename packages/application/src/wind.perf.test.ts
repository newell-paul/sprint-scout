import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { rankOpportunities, type Candidate } from "@scout/analysis";
import { syntheticProvenance as source, demoWeather } from "@scout/providers";
import { analyzeCandidates } from "./wind";

// Performance floor for the ranking path, run by `pnpm test:perf`. Budgets are
// about ten times the Apple M-series numbers so a CI runner passes and a
// quadratic regression still fails.
const startAt = "2026-09-08T00:00:00Z";
const candidates: Candidate[] = Array.from({ length: 50 }, (_, index) => ({
  segmentId: `demo-${String(index).padStart(2, "0")}`,
  source,
  geometry: {
    type: "LineString",
    coordinates: [
      [0, 0],
      [0, 0.01],
      [0.01, 0.01],
    ],
  },
  slots: Array.from({ length: 48 }, (_, hour) => {
    const attemptAt = new Date(Date.parse(startAt) + hour * 3600000)
      .toISOString()
      .replace(".000", "");
    return {
      attemptAt,
      weather: {
        scope: "segment" as const,
        hour: {
          ...demoWeather[0],
          validAt: attemptAt,
          windSpeedMps: 3 + (hour % 8),
        },
      },
    };
  }),
}));
const window = {
  startAt,
  endAt: "2026-09-10T00:00:00Z",
  timeZone: "UTC",
};
const now = new Date("2026-09-07T12:00:00Z");
const percentile = (samples: number[], fraction: number) =>
  [...samples].sort((a, b) => a - b)[
    Math.min(samples.length - 1, Math.floor(samples.length * fraction))
  ]!;
const timed = (work: () => void, runs: number) =>
  Array.from({ length: runs }, () => {
    const started = performance.now();
    work();
    return performance.now() - started;
  });

describe("ranking performance", () => {
  it("evaluates 50 segments over 48 hours within budget (p95 < 1 s)", () => {
    const samples = timed(() => {
      const result = analyzeCandidates(candidates, window, now);
      expect(result.errors).toEqual([]);
      expect(result.hourly).toHaveLength(2400);
    }, 5);
    expect(percentile(samples, 0.95)).toBeLessThan(1000);
  });

  it("ranks 2400 precomputed hours within budget (p95 < 20 ms)", () => {
    const { hourly } = analyzeCandidates(candidates, window, now);
    const samples = timed(() => rankOpportunities(hourly), 40);
    expect(percentile(samples, 0.95)).toBeLessThan(20);
  });
});
