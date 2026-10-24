// The Lighthouse deploy gate (intent/lighthouse-direct/spec.md). Scores and
// timings take the best of the runs, Lighthouse CI's "optimistic" rule, so
// one noisy run does not fail a deploy. Byte sizes do not vary between runs,
// so the budget reads the representative run.
export type Lhr = {
  categories: Record<string, { score: number | null }>;
  audits: Record<
    string,
    {
      numericValue?: number;
      details?: { items?: { resourceType?: string; transferSize?: number }[] };
    }
  >;
};
export type GateConfig = {
  minScores: Record<string, number>;
  maxNumeric: Record<string, number>;
  resourceKiB: Record<string, number>;
};

const defined = (values: (number | null | undefined)[]) =>
  values.filter((v): v is number => typeof v === "number");

export function representativeRun(runs: Lhr[]): number {
  const order = runs
    .map((run, index) => ({
      index,
      score: run.categories.performance?.score ?? 0,
    }))
    .sort((a, b) => a.score - b.score || a.index - b.index);
  const middle = order[Math.floor((order.length - 1) / 2)];
  if (!middle) return -1;
  // On a tie the earlier run represents, wherever the sort put it.
  return order.find((o) => o.score === middle.score)!.index;
}

export function lighthouseGate(runs: Lhr[], config: GateConfig): string[] {
  if (!runs.length) return ["no Lighthouse runs"];
  const failures: string[] = [];
  for (const [name, min] of Object.entries(config.minScores)) {
    const scores = defined(runs.map((r) => r.categories[name]?.score));
    if (!scores.length) failures.push(`${name}: not reported`);
    else if (Math.max(...scores) < min)
      failures.push(`${name}: best ${Math.max(...scores)} below ${min}`);
  }
  for (const [audit, max] of Object.entries(config.maxNumeric)) {
    const values = defined(runs.map((r) => r.audits[audit]?.numericValue));
    if (!values.length) failures.push(`${audit}: not reported`);
    else if (Math.min(...values) > max)
      failures.push(`${audit}: best ${Math.min(...values)} above ${max}`);
  }
  const items =
    runs[representativeRun(runs)]!.audits["network-requests"]?.details?.items;
  if (!items) return [...failures, "network-requests: not reported"];
  for (const [type, kib] of Object.entries(config.resourceKiB)) {
    const bytes = items
      .filter((i) => type === "total" || i.resourceType?.toLowerCase() === type)
      .reduce((sum, i) => sum + (i.transferSize ?? 0), 0);
    const size = Math.round(bytes / 1024);
    if (size > kib) failures.push(`${type}: ${size} KiB above ${kib} KiB`);
  }
  return failures;
}

export function manifestEntries(
  runs: Lhr[],
  url: string,
  base: (index: number) => string,
) {
  const chosen = representativeRun(runs);
  return runs.map((run, index) => ({
    url,
    isRepresentativeRun: index === chosen,
    jsonPath: `${base(index)}.report.json`,
    htmlPath: `${base(index)}.report.html`,
    summary: Object.fromEntries(
      Object.entries(run.categories).map(([name, c]) => [name, c.score ?? 0]),
    ),
  }));
}
