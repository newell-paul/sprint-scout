import type { Point } from "./library";
// Projects route points into a square box, preserving shape by scaling
// longitude with the cosine of the mean latitude. Returns SVG coordinates.
export function thumbnailPoints(
  points: readonly Point[],
  size: number,
  pad: number,
): [number, number][] {
  if (points.length === 0) return [];
  const meanLat = points.reduce((s, p) => s + p[1], 0) / points.length;
  const k = Math.cos((meanLat * Math.PI) / 180) || 1;
  const xs = points.map((p) => p[0] * k),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const inner = size - pad * 2;
  const scale = inner / span;
  const offsetX = (inner - (maxX - minX) * scale) / 2,
    offsetY = (inner - (maxY - minY) * scale) / 2;
  return points.map((p, i) => [
    pad + offsetX + (xs[i]! - minX) * scale,
    size - (pad + offsetY + (ys[i]! - minY) * scale),
  ]);
}
export function thumbnailPath(points: readonly [number, number][]) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}
