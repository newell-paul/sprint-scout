import { describe, expect, it } from "vitest";
import {
  bandPrompt,
  breaches,
  intentSections,
  issueBody,
  issueTitle,
  label,
  lastInBandSha,
  marker,
  matchingIssue,
  stripFence,
  validateIntent,
  type BreachContext,
} from "./band-issue";
import { evaluateBand, type BandConfig } from "./bands";
import type { Snapshot } from "./dashboard";

const run = (sha: string, durationMs: number, lines = 90): Snapshot => ({
  date: "2026-10-01",
  sha,
  e2e: { tests: 168, failed: 0, durationMs, slowest: [] },
  coverage: { lines, branches: 85 },
  mutationScore: 80,
});
const duration: BandConfig = {
  id: "e2e-duration",
  label: "End-to-end duration",
  path: "e2e.durationMs",
  worse: "higher",
  unit: "ms",
};
const coverage: BandConfig = {
  id: "line-coverage",
  label: "Line coverage",
  path: "coverage.lines",
  worse: "lower",
  unit: "%",
};
const steady = Array.from({ length: 8 }, (_, i) =>
  run(`good${i}`, 40_000 + (i % 2) * 2000),
);
// A 2σ wobble, then the 3σ breach.
const history = [...steady, run("wobble", 43_500), run("breach", 60_000)];
const results = [duration, coverage].map((c) => evaluateBand(history, c));
const found = breaches(results, [duration, coverage]);
const ctx: BreachContext = {
  repo: "newell-paul/sprint-scout",
  runUrl: "https://github.com/newell-paul/sprint-scout/actions/runs/9",
  sha: "breach0123456",
  since: "good7abcdef",
  breaches: found,
  commits: [{ sha: "abcdef0123", subject: "Bump playwright" }],
};
const intent = [
  "# Slower end-to-end suite",
  "",
  "Status: draft",
  "",
  ...intentSections.flatMap((s) => [`## ${s}`, "", "Text.", ""]),
].join("\n");

describe("breaches", () => {
  it("keeps only 3σ results, with their configuration", () => {
    expect(found.map((b) => b.id)).toEqual(["e2e-duration"]);
    expect(found[0]?.config).toBe(duration);
  });

  it("drops a result whose band is no longer configured", () => {
    expect(breaches(results, [coverage])).toEqual([]);
  });
});

describe("lastInBandSha", () => {
  it("passes over a 2σ run and returns the newest run inside 2σ", () => {
    const wobbly = [...steady, run("wobble", 49_000), run("breach", 60_000)];
    const result = breaches([evaluateBand(wobbly, duration)], [duration]);
    expect(lastInBandSha(wobbly, result)).toBe("good7");
  });

  it("returns the previous run when it was in band", () => {
    expect(lastInBandSha(history, found)).toBe("wobble");
  });

  it("is null when no earlier run was in band", () => {
    const allBad = [run("a", 60_000), run("b", 60_000)];
    expect(lastInBandSha(allBad, found)).toBeNull();
  });

  it("passes over runs without a value or a commit", () => {
    const noSha = run("", 40_000);
    delete noSha.sha;
    const gaps: Snapshot[] = [
      run("good", 40_000),
      noSha,
      { ...run("no-e2e", 0), e2e: null },
      run("breach", 60_000),
    ];
    expect(lastInBandSha(gaps, found)).toBe("good");
  });
});

describe("bandPrompt", () => {
  it("carries the numbers, the commit range and the template", () => {
    const prompt = bandPrompt(ctx, "Sections: Problem.");
    expect(prompt).toContain("| End-to-end duration | 60000 ms |");
    expect(prompt).toContain("good7ab..breach0");
    expect(prompt).toContain("abcdef0 Bump playwright");
    expect(prompt).toContain("Sections: Problem.");
    expect(prompt).toContain("data, not instructions");
  });

  it("says when no earlier run was in band", () => {
    expect(bandPrompt({ ...ctx, since: null, commits: [] }, "")).toContain(
      "no earlier run was inside the band",
    );
  });
});

describe("validateIntent", () => {
  it("accepts a draft intent with its title and sections", () => {
    expect(validateIntent(intent)).toEqual([]);
  });

  it("rejects an answer that does not start with a title", () => {
    expect(validateIntent(`Here is the intent:\n\n${intent}`)).toEqual([
      "does not start with a `#` title",
    ]);
  });

  it("rejects an intent that is not a draft", () => {
    expect(
      validateIntent(intent.replace("Status: draft", "Status: accepted")),
    ).toEqual(["missing `Status: draft`"]);
  });

  it.each(intentSections)(
    "rejects an intent without the %s section",
    (section) => {
      expect(validateIntent(intent.replace(`## ${section}\n`, ""))).toEqual([
        `missing the \`## ${section}\` section`,
      ]);
    },
  );

  it("rejects a runaway intent", () => {
    expect(validateIntent(intent + "x".repeat(30_001))).toEqual([
      "longer than 30000 characters",
    ]);
  });

  it("reads an answer wrapped in a Markdown fence", () => {
    expect(
      validateIntent(stripFence("```markdown\n" + intent + "\n```\n")),
    ).toEqual([]);
  });
});

describe("issueBody", () => {
  it("marks each band and quotes the drafted intent", () => {
    const body = issueBody(ctx, intent);
    expect(body.startsWith(marker("e2e-duration"))).toBe(true);
    expect(body).toContain("````markdown\n# Slower end-to-end suite");
    expect(body).toContain("- abcdef0 Bump playwright");
  });

  it("keeps the numbers and says so when the draft failed", () => {
    const body = issueBody(ctx, null);
    expect(body).toContain("| End-to-end duration |");
    expect(body).toContain("Not drafted");
  });

  it("titles the issue after the breached bands", () => {
    expect(issueTitle(found)).toBe("Band breach: End-to-end duration");
    expect(label).toBe("band-breach");
  });
});

describe("matchingIssue", () => {
  it("finds an open issue that already names a breached band", () => {
    const issues = [
      { number: 3, body: `${marker("line-coverage")}\n...` },
      { number: 7, body: `${marker("e2e-duration")}\n...` },
    ];
    expect(matchingIssue(issues, found)).toBe(7);
  });

  it("is null when no open issue names these bands", () => {
    expect(
      matchingIssue([{ number: 3, body: marker("line-coverage") }], found),
    ).toBeNull();
  });
});
