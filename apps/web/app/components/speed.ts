export type SpeedUnit = "km/h" | "mph";
export function speedValue(mps: number, unit: SpeedUnit = "km/h") {
  return mps * (unit === "mph" ? 2.2369362921 : 3.6);
}
export function formatSpeed(mps: number, unit: SpeedUnit = "km/h") {
  return `${speedValue(mps, unit).toFixed(1)} ${unit}`;
}
export function compassDirection(degrees: number) {
  const names = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];
  return names[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]!;
}
