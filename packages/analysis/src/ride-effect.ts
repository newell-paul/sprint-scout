// Reference-rider physics estimate. Not a personal prediction: the rider holds
// whatever constant power gives the calm reference speed on flat road, with
// fixed drag and rolling constants, steady wind, no drafting or stops.
export const rideEffectVersion = "ride-effect-v1" as const;
export type Rider = {
  calmSpeedKmh: number;
  cdaM2: number;
  crr: number;
  massKg: number;
  airDensity: number;
};
export const referenceRider: Rider = {
  calmSpeedKmh: 40,
  cdaM2: 0.36,
  crr: 0.005,
  massKg: 85,
  airDensity: 1.225,
};
export type RideEffect = {
  version: typeof rideEffectVersion;
  riderHeightFactor: number;
  calmSpeedMps: number;
  windSpeedMps: number;
  speedDeltaMps: number;
  timeDeltaS: number;
  band: RideEffectBand | null;
  rider: Rider;
};
// One-sigma forecast error for 10 m wind, growing with lead time. Constants
// are a documented heuristic for open terrain, not a verified model skill.
export type RideEffectBand = {
  leadHours: number;
  windSigmaMps: number;
  directionSigmaDegrees: number;
  speedDeltaLowMps: number;
  speedDeltaHighMps: number;
};
export function windUncertainty(leadHours: number) {
  const lead = Math.max(0, Math.min(240, leadHours));
  return {
    windSigmaMps: 1 + 0.02 * lead,
    directionSigmaDegrees: 15 + 0.3 * lead,
  };
}
// Error in the along-route component from speed and direction errors, using
// the angle between the wind vector and the leg. Direction error matters most
// when the wind is near-perpendicular; speed error when it is aligned.
export function alongRouteSigmaMps(
  tailwindMps: number,
  crosswindMps: number,
  leadHours: number,
) {
  const { windSigmaMps, directionSigmaDegrees } = windUncertainty(leadHours);
  const speed = Math.hypot(tailwindMps, crosswindMps);
  const cos = speed === 0 ? 1 : tailwindMps / speed;
  const sin = speed === 0 ? 0 : crosswindMps / speed;
  const direction = (directionSigmaDegrees * Math.PI) / 180;
  return Math.hypot(windSigmaMps * cos, speed * sin * direction);
}
const gravity = 9.80665;
// Forecast wind is reported at 10 m. Scale to handlebar height (1.5 m) with a
// logarithmic profile over open grassland (roughness length 0.03 m). Shelter
// from hedges or buildings is a separate factor the caller applies.
export const forecastHeightM = 10;
export const riderHeightM = 1.5;
export const roughnessLengthM = 0.03;
export const riderHeightFactor =
  Math.log(riderHeightM / roughnessLengthM) /
  Math.log(forecastHeightM / roughnessLengthM);
export function scaleToRiderHeight(windMps: number) {
  return windMps * riderHeightFactor;
}
const maxWindMps = 30;
const maxSpeedMps = 40;
function powerAt(v: number, windMps: number, rider: Rider) {
  const relative = v - windMps;
  const drag =
    0.5 * rider.airDensity * rider.cdaM2 * relative * Math.abs(relative);
  return v * (drag + rider.crr * rider.massKg * gravity);
}
export function referencePowerW(rider: Rider = referenceRider) {
  return powerAt(rider.calmSpeedKmh / 3.6, 0, rider);
}
// Ground speed at a given power with an along-route wind component (tailwind
// positive). The resistive force k(v-w)|v-w| + c rises with speed, so power
// v·F(v) rises from the free-rolling speed upward: the speed where a tailwind
// alone balances rolling resistance, or zero when it cannot. Bisection on that
// interval is deterministic and does not force a low-power rider up to the
// tailwind speed.
export function solveSpeedAtPowerMps(
  powerW: number,
  windMps: number,
  rider: Rider = referenceRider,
) {
  const w = Math.max(-maxWindMps, Math.min(maxWindMps, windMps));
  const k = 0.5 * rider.airDensity * rider.cdaM2;
  const c = rider.crr * rider.massKg * gravity;
  const freeRolling = w > 0 && k * w * w > c ? w - Math.sqrt(c / k) : 0;
  let low = freeRolling,
    high = maxSpeedMps;
  if (powerAt(low, w, rider) >= powerW) return low;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (powerAt(mid, w, rider) < powerW) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
export function solveSpeedMps(windMps: number, rider: Rider = referenceRider) {
  return solveSpeedAtPowerMps(referencePowerW(rider), windMps, rider);
}
// Owner-entered rider: sustained power, total mass and CdA. The calm speed is
// the still-air speed that power implies, so the same time-weighted model
// applies. Inputs are bounded; this remains a physics estimate, not a
// validated personal prediction.
export const riderLimits = {
  powerW: { min: 50, max: 1000 },
  massKg: { min: 40, max: 200 },
  cdaM2: { min: 0.15, max: 0.6 },
} as const;
export type RiderInput = { powerW: number; massKg: number; cdaM2: number };
export function isRiderInput(value: unknown): value is RiderInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (["powerW", "massKg", "cdaM2"] as const).every((key) => {
    const n = v[key];
    const limit = riderLimits[key];
    return typeof n === "number" && n >= limit.min && n <= limit.max;
  });
}
export function riderFromPower(input: RiderInput): Rider {
  if (!isRiderInput(input)) throw new Error("Rider inputs are out of range");
  const base: Rider = {
    ...referenceRider,
    massKg: input.massKg,
    cdaM2: input.cdaM2,
  };
  return {
    ...base,
    calmSpeedKmh: solveSpeedAtPowerMps(input.powerW, 0, base) * 3.6,
  };
}
export type RideLeg = {
  distanceM: number;
  tailwindMps: number;
  crosswindMps?: number;
};
function effectiveSpeed(
  legs: readonly RideLeg[],
  rider: Rider,
  shift: (leg: RideLeg) => number,
) {
  const total = legs.reduce((s, l) => s + l.distanceM, 0);
  const timeS = legs.reduce(
    (s, l) =>
      s +
      l.distanceM /
        solveSpeedMps(scaleToRiderHeight(l.tailwindMps + shift(l)), rider),
    0,
  );
  return { speedMps: total / timeS, timeS };
}
export function estimateRideEffect(
  legs: readonly RideLeg[],
  rider: Rider = referenceRider,
  options: { leadHours?: number | undefined } = {},
): RideEffect {
  const usable = legs.filter(
    (l) =>
      Number.isFinite(l.distanceM) &&
      l.distanceM > 0 &&
      Number.isFinite(l.tailwindMps),
  );
  if (usable.length === 0) throw new Error("Ride effect needs legs");
  const total = usable.reduce((s, l) => s + l.distanceM, 0);
  const calmSpeedMps = rider.calmSpeedKmh / 3.6;
  const calmTimeS = total / calmSpeedMps;
  const central = effectiveSpeed(usable, rider, () => 0);
  let band: RideEffectBand | null = null;
  const lead = options.leadHours;
  if (lead !== undefined && Number.isFinite(lead) && lead >= 0) {
    const sigma = (l: RideLeg) =>
      alongRouteSigmaMps(l.tailwindMps, l.crosswindMps ?? 0, lead);
    const low = effectiveSpeed(usable, rider, (l) => -sigma(l));
    const high = effectiveSpeed(usable, rider, (l) => sigma(l));
    band = {
      leadHours: lead,
      ...windUncertainty(lead),
      speedDeltaLowMps: low.speedMps - calmSpeedMps,
      speedDeltaHighMps: high.speedMps - calmSpeedMps,
    };
  }
  return {
    version: rideEffectVersion,
    riderHeightFactor,
    calmSpeedMps,
    windSpeedMps: central.speedMps,
    speedDeltaMps: central.speedMps - calmSpeedMps,
    timeDeltaS: central.timeS - calmTimeS,
    band,
    rider: { ...rider },
  };
}
