import {
  isRiderInput,
  referencePowerW,
  referenceRider,
  riderFromPower,
  riderLimits,
  type Rider,
  type RiderInput,
} from "@scout/analysis";
export const riderStorageKey = "sprint-scout.rider.v1";
export { riderLimits };
export const referenceInput: RiderInput = {
  powerW: Math.round(referencePowerW()),
  massKg: referenceRider.massKg,
  cdaM2: referenceRider.cdaM2,
};
// null means the reference rider; anything unreadable is ignored, not repaired.
export function readRiderInput(raw: string | null): RiderInput | null {
  if (raw === null) return null;
  if (raw.length > 500) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return isRiderInput(data)
      ? { powerW: data.powerW, massKg: data.massKg, cdaM2: data.cdaM2 }
      : null;
  } catch {
    return null;
  }
}
export function resolveRider(input: RiderInput | null): Rider {
  return input ? riderFromPower(input) : referenceRider;
}
export function parseRiderField(
  key: keyof RiderInput,
  value: string,
): number | null {
  const n = Number(value.trim());
  const limit = riderLimits[key];
  if (!value.trim() || !Number.isFinite(n) || n < limit.min || n > limit.max)
    return null;
  return key === "cdaM2" ? Math.round(n * 1000) / 1000 : Math.round(n);
}
