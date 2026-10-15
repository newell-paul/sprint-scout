export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "Unavailable";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remaining = rounded % 60;
  if (hours)
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${remaining.toString().padStart(2, "0")}s`;
  if (minutes) return `${minutes}m ${remaining.toString().padStart(2, "0")}s`;
  return `${remaining}s`;
}

export function formatTimeDifference(seconds: number) {
  if (!Number.isFinite(seconds)) return "Difference unavailable";
  const rounded = Math.round(seconds);
  if (rounded === 0) return "Same time as still air (to the nearest second)";
  return `${formatDuration(Math.abs(rounded))} ${rounded < 0 ? "quicker" : "slower"} than still air`;
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatZonedTime(at: string, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date(at))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.day} ${months[Number(parts.month) - 1]}, ${parts.hour}:${parts.minute} ${parts.timeZoneName!.replace(/^GMT[+-]0$/, "GMT")}`;
}
