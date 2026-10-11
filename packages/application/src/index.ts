import { demoSegments } from "@scout/providers";
import { withPermittedSources } from "./policy";
export * from "./policy";
export function listDemoSegments(now = new Date()) {
  return withPermittedSources(
    demoSegments.map((s) => s.provenance),
    "derivedOutputs",
    now,
    () => demoSegments,
  );
}

export { analyzeCandidates } from "./wind";
export * from "./time";
export * from "./forecast";
export { getDemoForecast } from "./weather-demo";
export { getPlannerData } from "./planner";
export { estimateDeparture } from "./departure";
export { getDemoConditions } from "./planner";
