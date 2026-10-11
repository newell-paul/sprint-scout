import { utcInstant } from "@scout/contracts";
export function estimateDeparture(
  attemptAt: string,
  approachMinutes: number,
  warmupMinutes: number,
) {
  utcInstant.parse(attemptAt);
  if (
    !Number.isInteger(approachMinutes) ||
    !Number.isInteger(warmupMinutes) ||
    approachMinutes < 0 ||
    approachMinutes > 360 ||
    warmupMinutes < 0 ||
    warmupMinutes > 120
  )
    throw new Error("Enter approach 0–360 and warm-up 0–120 whole minutes.");
  const departureAt = new Date(
    Date.parse(attemptAt) - (approachMinutes + warmupMinutes) * 60000,
  )
    .toISOString()
    .replace(".000", "");
  return {
    attemptAt,
    departureAt,
    approachMinutes,
    warmupMinutes,
    assumption:
      "Estimate based only on your supplied approach and warm-up durations; not a routing estimate.",
  };
}
