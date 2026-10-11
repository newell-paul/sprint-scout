import {
  plannerRequest,
  plannerResponse,
  demoConditions,
  forecastWindow,
  displayZone,
  type PlannerRequest,
  type Segment,
  type PlannerHour,
} from "@scout/contracts";
import {
  demoSegments,
  createPlannerProvider,
  plannerCoverage,
  plannerReferenceAt,
  type WeatherProvider,
} from "@scout/providers";
import { prepareGeometry, type Opportunity } from "@scout/analysis";
import { getForecastConditions } from "./forecast";
import { resolveLocalWindow } from "./time";
import { requirePermission, SourceNotPermitted } from "./policy";
const providers = new Map<PlannerRequest["scenario"], WeatherProvider>();
export function describeSegment(s: Segment) {
  const g = prepareGeometry(s.geometry);
  const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const directions = g.legs.map(
    (l) => compass[Math.round(l.bearingDegrees / 45) % 8]!,
  );
  return {
    id: s.id,
    name: s.name,
    lengthM: g.lengthM,
    direction: directions.filter((d, i) => d !== directions[i - 1]).join(" → "),
    gradePct: null,
  };
}
function presentHour(row: Opportunity): PlannerHour {
  return {
    ...row,
    legs: row.legs.map((leg) => {
      const b = (leg.bearingDegrees * Math.PI) / 180;
      const east =
        leg.tailwindMps * Math.sin(b) + leg.crosswindMps * Math.cos(b);
      const north =
        leg.tailwindMps * Math.cos(b) - leg.crosswindMps * Math.sin(b);
      return {
        ...leg,
        windBearingDegrees:
          Math.hypot(east, north) < 1e-9
            ? null
            : ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360,
      };
    }),
  };
}
// Trusted adapters supply records; they are never accepted from an HTTP argument.
export async function getDemoConditions(
  input: {
    startAt: string;
    endAt: string;
    timeZone: string;
    segmentIds: string[];
    limit: number;
  },
  options: {
    scenario?: PlannerRequest["scenario"];
    segments?: readonly Segment[];
    provider?: WeatherProvider;
  } = {},
) {
  const window = forecastWindow.parse({
    startAt: input.startAt,
    endAt: input.endAt,
  });
  const timeZone = displayZone.parse(input.timeZone);
  const scenario = options.scenario ?? "normal";
  const now = new Date(plannerReferenceAt);
  const records = options.segments ?? demoSegments;
  const selected = input.segmentIds.map((id) => {
    const s = records.find((r) => r.id === id);
    if (!s) throw new SourceNotPermitted();
    requirePermission(s.provenance, "analysis", now);
    requirePermission(s.provenance, "derivedOutputs", now);
    if (s.provenance.sourceKind !== "synthetic") throw new SourceNotPermitted();
    return s;
  });
  let provider = options.provider ?? providers.get(scenario);
  if (!provider) {
    provider = createPlannerProvider(scenario);
    providers.set(scenario, provider);
  }
  const routes = selected.map((s) =>
    scenario === "partial" && s.id === "demo-bend"
      ? {
          ...s,
          geometry: {
            ...s.geometry,
            coordinates: [
              s.geometry.coordinates[0]!,
              s.geometry.coordinates[0]!,
            ],
          },
        }
      : s,
  );
  const result = await getForecastConditions(
    routes,
    {
      ...window,
      timeZone,
      segmentIds: input.segmentIds,
      limit: input.limit,
      thresholds: { gustMps: 10, crosswindMps: 4, precipitationMm: 0.5 },
    },
    provider,
    now,
  );
  // Forecast service has checked raw metadata and every weather hour before disclosure.
  const sources = [
    ...selected.map((s) => s.provenance),
    ...result.weather.snapshots.flatMap((s) => [
      s.provenance,
      ...s.hours.map((h) => h.provenance),
    ]),
  ];
  const uniqueSources = [
    ...new Map(sources.map((p) => [JSON.stringify(p), p])).values(),
  ];
  return demoConditions.parse({
    mode: "demo",
    referenceAt: plannerReferenceAt,
    window,
    timeZone,
    coverage: plannerCoverage,
    segments: selected.map(describeSegment),
    hourly: result.hourly.map(presentHour),
    best: result.opportunities.map((r) => ({
      segmentId: r.segmentId,
      attemptAt: r.attemptAt,
    })),
    errors: result.errors,
    status: result.weather.status,
    retrievedAt: result.weather.snapshots[0]?.retrievedAt ?? null,
    attribution: result.weather.snapshots.length
      ? [result.weather.snapshots[0]!.attribution]
      : [],
    sources: uniqueSources,
  });
}
export async function getPlannerData(input: unknown) {
  const request = plannerRequest.parse(input);
  const window = resolveLocalWindow({
    date: request.date,
    startTime: request.startTime,
    endTime: request.endTime,
    timeZone: request.timeZone,
    ...(request.startChoice ? { startChoice: request.startChoice } : {}),
    ...(request.endChoice ? { endChoice: request.endChoice } : {}),
  });
  const result = await getDemoConditions(
    { ...window, segmentIds: request.segmentIds, limit: 2 },
    { scenario: request.scenario },
  );
  return plannerResponse.parse({
    ...result,
    request,
    segments: demoSegments.map(describeSegment),
  });
}
