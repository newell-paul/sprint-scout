// Summarises the heights a rider's own GPX file recorded along a segment.
// Display only: no estimate reads these numbers.
import { distance } from "@turf/distance";
import type { LonLat } from "./track-stretch";

export type ElevationProfile = {
  /** Distance from the start to each point, in metres. */
  distancesM: number[];
  startM: number;
  finishM: number;
  /** Finish minus start: positive rises, negative falls. */
  netM: number;
  lowestM: number;
  highestM: number;
};

export function elevationProfile(
  points: readonly LonLat[],
  heightsM: readonly number[],
): ElevationProfile {
  if (points.length < 2 || heightsM.length !== points.length)
    throw new Error(
      "Elevation needs one height for each of at least two points.",
    );
  const distancesM = [0];
  for (let i = 1; i < points.length; i++)
    distancesM.push(
      distancesM[i - 1]! +
        distance(points[i - 1]!, points[i]!, { units: "meters" }),
    );
  const startM = heightsM[0]!;
  const finishM = heightsM.at(-1)!;
  return {
    distancesM,
    startM,
    finishM,
    netM: finishM - startM,
    lowestM: Math.min(...heightsM),
    highestM: Math.max(...heightsM),
  };
}
