import { formatDuration } from "../components/time";

export function parseTarget(value: string): number | null {
  if (!/^\d{1,4}:[0-5]\d$/.test(value)) return null;
  const [minutes, seconds] = value.split(":").map(Number);
  const total = minutes! * 60 + seconds!;
  return total > 0 && total <= 86400 ? total : null;
}

export function targetDifference(
  estimated: number | null,
  target: number | null | undefined,
) {
  if (target == null) return "No target set";
  if (estimated === null) return "Target comparison unavailable";
  const difference = Math.round(estimated) - target;
  if (difference === 0) return "Estimate matches target (rounded)";
  return `Estimate ${formatDuration(Math.abs(difference))} ${difference < 0 ? "inside" : "outside"} target`;
}
