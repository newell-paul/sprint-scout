// Deterministic side of the pull request review (REVIEW.md, docs/sdlc.md
// step 11). The reviewer returns structured output; this module validates it
// into a tally, formats the job summary and folds the tallies of recent pull
// requests into one dashboard figure.
export const severities = ["blocker", "major", "minor", "nit"] as const;
export type Severity = (typeof severities)[number];
export type Findings = Record<Severity, number>;
export type StructuredReview = {
  findings: Findings;
  inline: number;
  verdict: string;
};
export type ReviewTally = StructuredReview & {
  pr: number;
  sha: string;
  run: number;
  model: string;
  at: string;
};
export type ReviewRecord = ReviewTally & { threads: number; resolved: number };
export type ReviewSummary = {
  findings: Findings;
  pulls: number;
  perPull: { pr: number; total: number }[];
  threads: number;
  resolved: number;
  resolvedShare: number | null;
};

const count = (value: unknown, name: string) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
};

// Accepts the action's structured_output and rejects anything that is not
// four counts, so a model that answered in prose cannot become a tally.
export function parseFindings(text: string): StructuredReview {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("structured output is not JSON");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("structured output is not an object");
  }
  const o = raw as Record<string, unknown>;
  const findings = Object.fromEntries(
    severities.map((s) => [s, count(o[s], s)]),
  ) as Findings;
  return {
    findings,
    inline: o["inline"] === undefined ? 0 : count(o["inline"], "inline"),
    verdict: typeof o["verdict"] === "string" ? o["verdict"].trim() : "",
  };
}

export const totalFindings = (f: Findings) =>
  severities.reduce((sum, s) => sum + f[s], 0);

export function tallyMarkdown(t: ReviewTally) {
  const lines = [
    "## Review",
    "",
    `Pull request #${t.pr} at \`${t.sha.slice(0, 7)}\`, ${t.model}.`,
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    ...severities.map(
      (s) => `| ${s[0]!.toUpperCase()}${s.slice(1)} | ${t.findings[s]} |`,
    ),
    "",
    `${totalFindings(t.findings)} findings, ${t.inline} inline comments.${t.verdict ? ` ${t.verdict}` : ""}`,
    "",
  ];
  return lines.join("\n");
}

// Latest tally per pull request only, so a re-review does not count twice.
export function reviewSummary(
  records: ReviewRecord[],
  window = 20,
): ReviewSummary | null {
  const latest = new Map<number, ReviewRecord>();
  for (const r of records) {
    const seen = latest.get(r.pr);
    if (!seen || r.at > seen.at) latest.set(r.pr, r);
  }
  const recent = [...latest.values()]
    .sort((a, b) => a.pr - b.pr)
    .slice(-window);
  if (!recent.length) return null;
  const findings = Object.fromEntries(
    severities.map((s) => [s, recent.reduce((n, r) => n + r.findings[s], 0)]),
  ) as Findings;
  const threads = recent.reduce((n, r) => n + r.threads, 0);
  const resolved = recent.reduce((n, r) => n + r.resolved, 0);
  return {
    findings,
    pulls: recent.length,
    perPull: recent.map((r) => ({
      pr: r.pr,
      total: totalFindings(r.findings),
    })),
    threads,
    resolved,
    resolvedShare: threads ? (resolved / threads) * 100 : null,
  };
}
