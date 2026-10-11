import { provenance, weatherHour } from "@scout/contracts";
import {
  AnalysisError,
  algorithmVersion,
  prepareGeometry,
  evaluateHour,
  rankOpportunities,
  validateOptions,
  type Candidate,
  type Options,
  type Opportunity,
} from "@scout/analysis";
import { requirePermission, SourceNotPermitted } from "./policy";

// No transport accepts caller-provided provenance. Adapters must supply trusted provider records.
export function analyzeCandidates(
  candidates: readonly Candidate[],
  options: Options,
  now: Date,
) {
  validateOptions(options, candidates);
  const hourly: Opportunity[] = [];
  const errors: {
    segmentId: string;
    attemptAt: string | null;
    code: string;
    algorithmVersion: typeof algorithmVersion;
  }[] = [];
  const check = (source: unknown) => {
    requirePermission(source, "analysis", now);
    requirePermission(source, "derivedOutputs", now);
  };
  const record = (e: unknown, segmentId: string, attemptAt: string | null) => {
    if (!(e instanceof AnalysisError) && !(e instanceof SourceNotPermitted))
      throw e;
    errors.push({ segmentId, attemptAt, code: e.code, algorithmVersion });
  };
  for (const candidate of candidates) {
    if (options.segmentIds && !options.segmentIds.includes(candidate.segmentId))
      continue;
    try {
      check(candidate.source);
      const source = provenance.parse(candidate.source);
      if (source.sourceKind !== "synthetic") throw new SourceNotPermitted();
      const geometry = prepareGeometry(candidate.geometry);
      if (candidate.slots.length === 0)
        throw new AnalysisError("FORECAST_UNAVAILABLE", "No weather supplied");
      for (const slot of candidate.slots) {
        try {
          if (
            !/^\d{4}-\d\d-\d\dT\d\d:00:00Z$/.test(slot.attemptAt) ||
            slot.attemptAt < options.startAt ||
            slot.attemptAt >= options.endAt
          )
            throw new AnalysisError(
              "OUTSIDE_FORECAST_RANGE",
              "Attempt is outside the supplied hourly window",
            );
          const raw =
            slot.weather.scope === "segment"
              ? [slot.weather.hour]
              : slot.weather.hours;
          if (raw.length === 0 || raw.length > geometry.legs.length)
            throw new AnalysisError(
              "FORECAST_UNAVAILABLE",
              "Missing or excessive spatial observations",
            );
          const parsed = raw.map((h) => {
            const result = weatherHour.safeParse(h);
            if (!result.success)
              throw new AnalysisError(
                "FORECAST_UNAVAILABLE",
                "Invalid weather",
              );
            check(result.data.provenance);
            if (result.data.validAt !== slot.attemptAt)
              throw new AnalysisError(
                "OUTSIDE_FORECAST_RANGE",
                "No observation for attempt time",
              );
            return result.data;
          });
          const hours =
            slot.weather.scope === "segment"
              ? geometry.legs.map(() => parsed[0]!)
              : parsed;
          const row = evaluateHour(
            geometry,
            hours,
            candidate.segmentId,
            source,
            options,
          );
          if (
            options.minTailwindMps === undefined ||
            row.tailwindMps >= options.minTailwindMps
          )
            hourly.push(row);
        } catch (e) {
          record(e, candidate.segmentId, slot.attemptAt);
        }
      }
    } catch (e) {
      record(e, candidate.segmentId, null);
    }
  }
  return {
    algorithmVersion,
    opportunities: rankOpportunities(hourly, options.limit),
    hourly,
    errors,
  };
}
