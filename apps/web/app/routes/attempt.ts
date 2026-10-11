import { formatDuration } from "../components/time";

export type Availability = { from: string; until: string; timeZone: string };

function validLocalTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 16) === value
  );
}

export function validAvailability(value: Availability) {
  return (
    validLocalTime(value.from) &&
    validLocalTime(value.until) &&
    value.from < value.until
  );
}

export function withinAvailability(at: string, window: Availability | null) {
  if (!window) return true;
  if (!validAvailability(window) || !Number.isFinite(Date.parse(at)))
    return false;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: window.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(at));
    const part = (name: string) =>
      parts.find((entry) => entry.type === name)?.value;
    const local = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
    return local >= window.from && local < window.until;
  } catch {
    return false;
  }
}

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
