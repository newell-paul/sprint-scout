// Regenerates the GPX fixtures used by e2e/efforts.spec.ts. Deterministic:
// pnpm exec tsx e2e/data/make-gpx.ts
import { writeFileSync } from "node:fs";

// Spherical helpers matching turf's earth radius, so no workspace package is needed here.
const R = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
function distance(a: Coordinate, b: Coordinate) {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function bearing(a: Coordinate, b: Coordinate) {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x =
    Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return deg(Math.atan2(y, x));
}
function destination(origin: Coordinate, d: number, bearingDeg: number) {
  const lat1 = rad(origin[1]);
  const lon1 = rad(origin[0]);
  const bearingRad = rad(bearingDeg);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d / R) +
      Math.cos(lat1) * Math.sin(d / R) * Math.cos(bearingRad),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { geometry: { coordinates: [deg(lon2), deg(lat2)] as Coordinate } };
}

type Coordinate = [number, number];
const northbound: Coordinate[] = [
  [-0.12, 51.5],
  [-0.12, 51.51],
];
const start = Date.parse("2026-09-12T09:00:00Z");

function along(points: Coordinate[], d: number): Coordinate {
  let offset = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const legM = distance(a, b);
    if (d <= offset + legM || i === points.length - 1) {
      const p = destination(a, d - offset, bearing(a, b)).geometry.coordinates;
      return [p[0]!, p[1]!];
    }
    offset += legM;
  }
  throw new Error("unreachable");
}
function gpx(
  name: string,
  points: Coordinate[],
  speedMps: number,
  laps: number,
  reverse = false,
) {
  const route = reverse ? [...points].reverse() : points;
  const total = route
    .slice(1)
    .reduce((sum, p, i) => sum + distance(route[i]!, p), 0);
  const rows: string[] = [];
  let at = start;
  for (let lap = 0; lap < laps; lap++) {
    for (let d = -200; d <= total + 200; d += speedMps) {
      const [lon, lat] = along(route, d);
      rows.push(
        `<trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>20</ele><time>${new Date(at).toISOString()}</time></trkpt>`,
      );
      at += 1000;
    }
    at += 90_000;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="SprintScout fixtures"><trk><name>${name}</name><trkseg>\n${rows.join("\n")}\n</trkseg></trk></gpx>\n`;
}
writeFileSync(
  "e2e/data/northbound-two-laps.gpx",
  gpx("Two laps north", northbound, 11, 2),
);
writeFileSync(
  "e2e/data/northbound-reversed.gpx",
  gpx("Southbound", northbound, 11, 1, true),
);
writeFileSync(
  "e2e/data/not-a-track.gpx",
  `<?xml version="1.0"?><gpx version="1.1"><wpt lat="51.5" lon="-0.12"><name>Cafe</name></wpt></gpx>\n`,
);
