import {
  alongRouteSigmaMps,
  referencePowerW,
  referenceRider,
  riderHeightFactor,
  scaleToRiderHeight,
  windUncertainty,
  type RideEffect,
  type RideEffectBand,
  type RideLeg,
  type Rider,
} from "./ride-effect";

export const terrainEffectVersion = "terrain-effect-v1" as const;
export type TerrainEffect = Omit<RideEffect, "version"> & {
  version: typeof terrainEffectVersion;
};
export type TerrainLeg = RideLeg & { grade: number };

export function terrainForceN(
  speedMps: number,
  windMps: number,
  grade: number,
  rider: Rider,
) {
  const angle = Math.atan(grade);
  const relative = speedMps - windMps;
  return (
    0.5 * rider.airDensity * rider.cdaM2 * relative * Math.abs(relative) +
    rider.massKg * 9.80665 * (Math.sin(angle) + rider.crr * Math.cos(angle))
  );
}

export function solveTerrainSpeedMps(
  powerW: number,
  windMps: number,
  grade: number,
  rider: Rider = referenceRider,
) {
  if (
    ![
      powerW,
      windMps,
      grade,
      rider.massKg,
      rider.cdaM2,
      rider.airDensity,
      rider.crr,
    ].every(Number.isFinite) ||
    powerW <= 0 ||
    Math.abs(windMps) > 30 ||
    Math.abs(grade) > 0.3 ||
    rider.massKg <= 0 ||
    rider.cdaM2 <= 0 ||
    rider.airDensity <= 0 ||
    rider.crr < 0
  )
    throw new Error("Terrain model inputs are outside supported limits.");
  let low = 0;
  let high = 40;
  const residual = (speed: number) =>
    terrainForceN(speed, windMps, grade, rider) - powerW / speed;
  if (residual(high) < 0)
    throw new Error("Terrain speed exceeds the model limit of 144 km/h.");
  for (let iteration = 0; iteration < 60; iteration++) {
    const middle = (low + high) / 2;
    if (residual(middle) < 0) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function estimateTerrainEffect(
  legs: readonly TerrainLeg[],
  rider: Rider = referenceRider,
  leadHours?: number,
): TerrainEffect {
  if (
    !legs.length ||
    legs.some(
      (leg) =>
        !Number.isFinite(leg.distanceM) ||
        leg.distanceM <= 0 ||
        !Number.isFinite(leg.tailwindMps) ||
        !Number.isFinite(leg.crosswindMps ?? 0) ||
        !Number.isFinite(leg.grade) ||
        Math.abs(leg.grade) > 0.3,
    )
  )
    throw new Error("Complete valid terrain legs are required.");
  const distanceM = legs.reduce((total, leg) => total + leg.distanceM, 0);
  const powerW = referencePowerW(rider);
  const time = (wind: (leg: TerrainLeg) => number) =>
    legs.reduce(
      (total, leg) =>
        total +
        leg.distanceM /
          solveTerrainSpeedMps(
            powerW,
            scaleToRiderHeight(wind(leg)) * Math.cos(Math.atan(leg.grade)),
            leg.grade,
            rider,
          ),
      0,
    );
  const calmTimeS = time(() => 0);
  const windTimeS = time((leg) => leg.tailwindMps);
  const calmSpeedMps = distanceM / calmTimeS;
  const windSpeedMps = distanceM / windTimeS;
  let band: RideEffectBand | null = null;
  if (leadHours !== undefined && Number.isFinite(leadHours) && leadHours >= 0) {
    const sigma = (leg: TerrainLeg) =>
      alongRouteSigmaMps(leg.tailwindMps, leg.crosswindMps ?? 0, leadHours);
    band = {
      leadHours,
      ...windUncertainty(leadHours),
      speedDeltaLowMps:
        distanceM / time((leg) => leg.tailwindMps - sigma(leg)) - calmSpeedMps,
      speedDeltaHighMps:
        distanceM / time((leg) => leg.tailwindMps + sigma(leg)) - calmSpeedMps,
    };
  }
  return {
    version: terrainEffectVersion,
    riderHeightFactor,
    calmSpeedMps,
    windSpeedMps,
    speedDeltaMps: windSpeedMps - calmSpeedMps,
    timeDeltaS: windTimeS - calmTimeS,
    band,
    rider: { ...rider },
  };
}
