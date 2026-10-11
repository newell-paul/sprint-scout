import { performance } from "node:perf_hooks";
import { cpus, platform, arch } from "node:os";
import { analyzeCandidates } from "./wind";
import { rankOpportunities, type Candidate } from "@scout/analysis";
import { syntheticProvenance as source, demoWeather } from "@scout/providers";
const startAt = "2026-09-08T00:00:00Z";
const candidates: Candidate[] = Array.from({ length: 50 }, (_, i) => ({
  segmentId: `demo-${String(i).padStart(2, "0")}`,
  source,
  geometry: {
    type: "LineString",
    coordinates: [
      [0, 0],
      [0, 0.01],
      [0.01, 0.01],
    ],
  },
  slots: Array.from({ length: 48 }, (_, h) => {
    const attemptAt = new Date(Date.parse(startAt) + h * 3600000)
      .toISOString()
      .replace(".000", "");
    return {
      attemptAt,
      weather: {
        scope: "segment" as const,
        hour: {
          ...demoWeather[0],
          validAt: attemptAt,
          windSpeedMps: 3 + (h % 8),
        },
      },
    };
  }),
}));
const start = performance.now();
const result = analyzeCandidates(
  candidates,
  { startAt, endAt: "2026-09-10T00:00:00Z", timeZone: "UTC" },
  new Date("2026-09-07T12:00:00Z"),
);
const evaluationMs = performance.now() - start;
if (result.errors.length || result.hourly.length !== 2400)
  throw new Error("Benchmark fixture failed");
const samples = Array.from({ length: 20 }, () => {
  const t = performance.now();
  rankOpportunities(result.hourly);
  return performance.now() - t;
}).sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
      segments: 50,
      hours: 48,
      legsPerSegment: result.hourly[0]?.legs.length,
      evaluationMs,
      cachedRankingMedianMs: samples[10],
      cachedRankingMaxMs: samples[19],
      note: "Cached means precomputed in-memory opportunity rows, not a persistent result cache. Full evaluation includes validation and policy checks.",
    },
    null,
    2,
  ),
);
