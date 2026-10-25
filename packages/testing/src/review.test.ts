import { describe, expect, it } from "vitest";
import {
  parseFindings,
  reviewPayloads,
  reviewSummary,
  tallyMarkdown,
  totalFindings,
  type ReviewRecord,
  type ReviewTally,
} from "./review";

const tally: ReviewTally = {
  pr: 12,
  sha: "0123456789abcdef",
  run: 42,
  model: "claude-sonnet-5-5",
  at: "2026-10-10T09:00:00Z",
  findings: { blocker: 0, major: 1, minor: 2, nit: 0 },
  inline: 3,
  verdict: "One major: the archive loader swallows a 429.",
};
const record = (
  pr: number,
  findings: Partial<ReviewRecord["findings"]>,
  threads = 0,
  resolved = 0,
  at = "2026-10-10T09:00:00Z",
): ReviewRecord => ({
  ...tally,
  pr,
  at,
  findings: { blocker: 0, major: 0, minor: 0, nit: 0, ...findings },
  threads,
  resolved,
});

describe("parseFindings", () => {
  it("accepts the four counts with optional inline count and verdict", () => {
    expect(
      parseFindings(
        '{"blocker":0,"major":1,"minor":2,"nit":0,"inline":3,"verdict":" ok "}',
      ),
    ).toEqual({
      findings: { blocker: 0, major: 1, minor: 2, nit: 0 },
      inline: 3,
      verdict: "ok",
    });
    expect(parseFindings('{"blocker":0,"major":0,"minor":0,"nit":0}')).toEqual({
      findings: { blocker: 0, major: 0, minor: 0, nit: 0 },
      inline: 0,
      verdict: "",
    });
  });

  it.each([
    ["prose", "Looks good to me", "not JSON"],
    ["an array", "[1,2,3,4]", "not an object"],
    ["a missing severity", '{"blocker":0,"major":0,"minor":0}', "nit must be"],
    [
      "a negative count",
      '{"blocker":-1,"major":0,"minor":0,"nit":0}',
      "blocker must be",
    ],
    [
      "a fraction",
      '{"blocker":0,"major":0.5,"minor":0,"nit":0}',
      "major must be",
    ],
    [
      "a string count",
      '{"blocker":0,"major":0,"minor":"2","nit":0}',
      "minor must be",
    ],
    [
      "a bad inline count",
      '{"blocker":0,"major":0,"minor":0,"nit":0,"inline":"x"}',
      "inline must be",
    ],
  ])("rejects %s", (_name, text, message) => {
    expect(() => parseFindings(text)).toThrow(message);
  });
});

describe("tallyMarkdown", () => {
  it("writes the table, the totals and the verdict", () => {
    const md = tallyMarkdown(tally);
    expect(md).toContain("Pull request #12 at `0123456`, claude-sonnet-5-5.");
    expect(md).toContain("| Major | 1 |");
    expect(md).toContain("| Nit | 0 |");
    expect(md).toContain(
      "3 findings, 3 inline comments. One major: the archive loader swallows a 429.",
    );
    expect(totalFindings(tally.findings)).toBe(3);
    expect(tallyMarkdown({ ...tally, verdict: "" })).toMatch(
      /inline comments\.\n$/,
    );
  });
});

describe("reviewSummary", () => {
  it("returns null without records", () => {
    expect(reviewSummary([])).toBeNull();
  });

  it("keeps the latest tally per pull request, sums the window and shares threads", () => {
    const summary = reviewSummary([
      record(3, { major: 2 }, 2, 1, "2026-10-01T00:00:00Z"),
      record(3, { major: 1 }, 1, 1, "2026-10-02T00:00:00Z"),
      record(1, { blocker: 1, nit: 4 }, 1, 0),
      record(2, { minor: 3 }, 3, 3),
    ]);
    expect(summary).toEqual({
      findings: { blocker: 1, major: 1, minor: 3, nit: 4 },
      pulls: 3,
      perPull: [
        { pr: 1, total: 5 },
        { pr: 2, total: 3 },
        { pr: 3, total: 1 },
      ],
      threads: 5,
      resolved: 4,
      resolvedShare: 80,
    });
  });

  it("limits to the most recent pull requests and leaves the share null without threads", () => {
    const records = Array.from({ length: 25 }, (_, i) =>
      record(i + 1, { minor: 1 }),
    );
    const summary = reviewSummary(records, 20);
    expect(summary?.pulls).toBe(20);
    expect(summary?.perPull[0]?.pr).toBe(6);
    expect(summary?.findings.minor).toBe(20);
    expect(summary?.resolvedShare).toBeNull();
  });
});

const minor = {
  path: "packages/testing/src/dashboard.cli.ts",
  line: 92,
  body: "**Minor** · Font copy has no test",
};
const review = (extra: object) =>
  JSON.stringify({ blocker: 0, major: 0, minor: 1, nit: 0, ...extra });

describe("reviewPayloads", () => {
  it("builds one review with the findings on their lines", () => {
    const payloads = reviewPayloads(
      review({ body: "### Review", comments: [minor] }),
      "abc123",
    );
    expect(payloads?.review).toEqual({
      commit_id: "abc123",
      event: "COMMENT",
      body: "### Review",
      comments: [{ ...minor, side: "RIGHT" }],
    });
    expect(payloads?.placed).toBe(1);
    expect(parseFindings(review({ body: "x", comments: [minor] })).inline).toBe(
      1,
    );
  });

  it("falls back to the body alone with the comments folded in", () => {
    const fallback = reviewPayloads(
      review({ body: "### Review", comments: [minor] }),
      "abc123",
    )?.fallback;
    expect(fallback?.comments).toEqual([]);
    expect(fallback?.body).toContain("Not placed on the diff");
    expect(fallback?.body).toContain(
      "`packages/testing/src/dashboard.cli.ts:92` **Minor** · Font copy has no test",
    );
  });

  it.each([
    ["no path", { ...minor, path: "" }],
    ["a zero line", { ...minor, line: 0 }],
    ["a fractional line", { ...minor, line: 1.5 }],
    ["an empty body", { ...minor, body: " " }],
    ["not an object", "packages/x.ts:1 broken"],
  ])("moves a comment with %s into the body", (_name, comment) => {
    const payloads = reviewPayloads(
      review({ body: "### Review", comments: [minor, comment] }),
      "abc123",
    );
    expect(payloads?.review.comments).toHaveLength(1);
    expect(payloads?.review.body).toContain("Not placed on the diff");
    expect(payloads?.placed).toBe(1);
  });

  it("posts nothing without a body, and a body alone without findings", () => {
    expect(reviewPayloads(review({ comments: [minor] }), "abc123")).toBeNull();
    expect(reviewPayloads(review({ body: "  " }), "abc123")).toBeNull();
    const clean = reviewPayloads(review({ body: "No findings." }), "abc123");
    expect(clean?.review.comments).toEqual([]);
    expect(clean?.review.body).toBe("No findings.");
  });
});
