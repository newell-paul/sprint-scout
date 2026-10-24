import { describe, expect, it } from "vitest";
import {
  lighthouseGate,
  manifestEntries,
  representativeRun,
  type GateConfig,
  type Lhr,
} from "./lighthouse-gate";

const config: GateConfig = {
  minScores: { performance: 0.9, accessibility: 0.9 },
  maxNumeric: { "largest-contentful-paint": 2500 },
  resourceKiB: { script: 650, total: 900 },
};

const run = (
  performance: number,
  lcp = 1000,
  requests: { resourceType: string; transferSize: number }[] = [
    { resourceType: "Script", transferSize: 500 * 1024 },
    { resourceType: "Document", transferSize: 10 * 1024 },
  ],
): Lhr => ({
  categories: {
    performance: { score: performance },
    accessibility: { score: 1 },
  },
  audits: {
    "largest-contentful-paint": { numericValue: lcp },
    "network-requests": { details: { items: requests } },
  },
});

describe("lighthouse gate", () => {
  it("passes when every threshold is met", () => {
    expect(lighthouseGate([run(0.95), run(0.97), run(0.96)], config)).toEqual(
      [],
    );
  });

  it("takes the best run for scores and timings, so one noisy run does not fail", () => {
    expect(
      lighthouseGate([run(0.5, 4000), run(0.95, 1200), run(0.6, 3900)], config),
    ).toEqual([]);
  });

  it("fails each score and timing threshold that every run misses", () => {
    expect(lighthouseGate([run(0.8, 2600), run(0.85, 2700)], config)).toEqual([
      "performance: best 0.85 below 0.9",
      "largest-contentful-paint: best 2600 above 2500",
    ]);
  });

  it("sums the representative run's requests against the resource budget", () => {
    const heavy = run(0.95, 1000, [
      { resourceType: "Script", transferSize: 700 * 1024 },
      { resourceType: "Font", transferSize: 250 * 1024 },
    ]);
    expect(lighthouseGate([heavy], config)).toEqual([
      "script: 700 KiB above 650 KiB",
      "total: 950 KiB above 900 KiB",
    ]);
  });

  it("fails a category or audit that is not reported", () => {
    const bare: Lhr = { categories: { performance: { score: 1 } }, audits: {} };
    expect(lighthouseGate([bare], config)).toEqual([
      "accessibility: not reported",
      "largest-contentful-paint: not reported",
      "network-requests: not reported",
    ]);
    expect(lighthouseGate([], config)).toEqual(["no Lighthouse runs"]);
  });

  it("represents the runs by the median performance score, the earlier run on a tie", () => {
    expect(representativeRun([run(0.9), run(0.99), run(0.95)])).toBe(2);
    expect(representativeRun([run(0.95), run(0.95), run(0.9)])).toBe(0);
    expect(representativeRun([run(0.9)])).toBe(0);
  });

  it("writes manifest entries in the shape the dashboard reads", () => {
    const entries = manifestEntries(
      [run(0.9), run(0.99), run(0.95)],
      "http://x/",
      (i) => `.lighthouseci/${i}`,
    );
    expect(entries[2]).toEqual({
      url: "http://x/",
      isRepresentativeRun: true,
      jsonPath: ".lighthouseci/2.report.json",
      htmlPath: ".lighthouseci/2.report.html",
      summary: { performance: 0.95, accessibility: 1 },
    });
    expect(entries.filter((e) => e.isRepresentativeRun)).toHaveLength(1);
  });
});
