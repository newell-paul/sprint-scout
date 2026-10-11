import { provenance, type SourcePolicy } from "@scout/contracts";
export class SourceNotPermitted extends Error {
  readonly code = "SOURCE_NOT_PERMITTED";
  constructor() {
    super("Source is not permitted for this operation");
  }
}
// Server-owned registry: client-provided permission flags can only restrict, never grant access.
export function requirePermission(
  input: unknown,
  operation: keyof Omit<SourcePolicy, "decisionId">,
  now: Date,
): void {
  const parsed = provenance.safeParse(input);
  if (!parsed.success || !Number.isFinite(now.getTime()))
    throw new SourceNotPermitted();
  const p = parsed.data;
  if (
    !(
      (p.sourceKind === "synthetic" &&
        p.sourceId === "demo-v1" &&
        p.policy.decisionId === "synthetic-v1") ||
      (p.sourceKind === "open-meteo" &&
        p.sourceId === "open-meteo-demo-v1" &&
        p.policy.decisionId === "open-meteo-demo-v1" &&
        p.expiresAt !== null)
    ) ||
    !p.policy[operation] ||
    (p.expiresAt !== null && Date.parse(p.expiresAt) <= now.getTime())
  )
    throw new SourceNotPermitted();
}
export function withPermittedSources<T>(
  sources: readonly unknown[],
  operation: keyof Omit<SourcePolicy, "decisionId">,
  now: Date,
  action: () => T,
): T {
  if (sources.length === 0) throw new SourceNotPermitted();
  sources.forEach((source) => requirePermission(source, operation, now));
  return action();
}
