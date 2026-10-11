import { expect } from "vitest";
import { commands, type Locator } from "vitest/browser";
import { referenceRider } from "@scout/analysis";
import {
  estimateRouteRideEffect,
  type RouteRideEffect,
  type RouteWindHour,
} from "@scout/application/route-wind";
import {
  sampleTerrain,
  terrainProfileVersion,
  type TerrainProfile,
} from "@scout/application/terrain";
import { defaultOpenMeteoConfig } from "@scout/testing/open-meteo";
import type { DrawnRoute, Point } from "../app/routes/library";

/** Instant the browser clock is frozen at; a Friday 08:00 in London. */
export const fixedTime = "2026-09-11T07:00:00Z";
/** Shared msw configuration; tests mutate it and it is reset after each. */
export const openMeteo = defaultOpenMeteoConfig();
export const resetOpenMeteo = () =>
  Object.assign(openMeteo, defaultOpenMeteoConfig());

export const northbound: Point[] = [
  [-0.12, 51.5],
  [-0.12, 51.51],
];
export const rider = referenceRider;

let shift = 0;
/** A northbound pair no earlier test has fetched, so the forecast cache misses. */
export const uniquePoints = (): Point[] => {
  shift += 1;
  return northbound.map(([lng, lat]) => [lng + shift * 0.01, lat]);
};

export const aRoute = (overrides: Partial<DrawnRoute> = {}): DrawnRoute => ({
  id: "hill",
  name: "Test hill",
  slot: 0,
  points: northbound,
  confirmed: true,
  createdAt: "2026-09-10T00:00:00Z",
  ...overrides,
});

export const anHour = (
  overrides: Partial<RouteWindHour> = {},
): RouteWindHour => ({
  at: fixedTime,
  speedMps: 4,
  fromDegrees: 180,
  flowDegrees: 0,
  weatherCode: 1,
  isDay: true,
  gustMps: 6,
  precipitationMm: 0,
  precipitationProbabilityPct: 10,
  ...overrides,
});

export const anEffect = (
  hour: RouteWindHour = anHour(),
  route: DrawnRoute = aRoute(),
): RouteRideEffect | null =>
  estimateRouteRideEffect(
    route.points,
    hour,
    fixedTime,
    rider,
    route.terrainMode === "terrain" ? (route.terrain ?? null) : undefined,
    route.shelter ?? "exposed",
  );

/** A valid profile for `points`, rising 4 m per 100 m like the recorded fixture. */
export const aTerrain = (points: Point[] = northbound): TerrainProfile => ({
  version: terrainProfileVersion,
  geometryKey: JSON.stringify(points),
  retrievedAt: "2026-09-10T06:00:00Z",
  source: "Open-Meteo / Copernicus DEM GLO-90 2021",
  elevationsM: sampleTerrain(points).distancesM.map(
    (distanceM) => 50 + distanceM * 0.04,
  ),
});

/** Commit the accessibility tree of `locator` as `__aria__/<name>.aria.yml`. */
export async function aria(name: string, locator: Locator) {
  const yaml = await commands.ariaSnapshot(locator);
  const testPath = expect.getState().testPath ?? "";
  const directory = testPath.slice(0, testPath.lastIndexOf("/"));
  await expect(yaml).toMatchFileSnapshot(
    `${directory}/__aria__/${name}.aria.yml`,
  );
}

declare module "vitest/browser" {
  interface BrowserCommands {
    ariaSnapshot: (locator: Locator) => Promise<string>;
  }
}
