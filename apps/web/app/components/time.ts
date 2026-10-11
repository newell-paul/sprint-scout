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
