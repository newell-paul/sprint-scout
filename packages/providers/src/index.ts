import {
  segment,
  effort,
  weatherHour,
  type Provenance,
} from "@scout/contracts";
export const syntheticProvenance: Provenance = {
  sourceKind: "synthetic",
  sourceId: "demo-v1",
  retrievedAt: "2026-09-07T12:00:00Z",
  expiresAt: null,
  policy: {
    analysis: true,
    persistence: true,
    derivedOutputs: true,
    aiDisclosure: true,
    decisionId: "synthetic-v1",
  },
};
export const demoSegments = [
  {
    id: "demo-north",
    name: "Synthetic North",
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 51],
        [0, 51.01],
      ],
    },
    provenance: syntheticProvenance,
  },
  {
    id: "demo-bend",
    name: "Synthetic Bend",
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 51],
        [0.01, 51],
        [0.01, 51.01],
      ],
    },
    provenance: syntheticProvenance,
  },
].map((value) => segment.parse(value));
export const demoEfforts = [
  effort.parse({
    id: "effort-demo-1",
    segmentId: "demo-north",
    startedAt: "2026-09-01T16:00:00Z",
    elapsedSeconds: 180,
    provenance: syntheticProvenance,
  }),
];
export const demoWeather = [
  weatherHour.parse({
    validAt: "2026-09-08T16:00:00Z",
    windSpeedMps: 5,
    windFromDegrees: 180,
    gustMps: null,
    precipitationMm: 0,
    precipitationProbabilityPct: null,
    temperatureC: 18,
    provenance: syntheticProvenance,
  }),
];

export * from "./weather";
export * from "./weather-fixtures";
export * from "./planner-fixtures";
