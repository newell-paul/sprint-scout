// Minimal GPX track reader for files exported from a ride recorder. It reads
// <trkpt> elements only, never network or extensions, and stays bounded.
import type { TrackPoint } from "@scout/analysis/effort-match";

export const gpxLimits = { bytes: 25_000_000, points: 250_000 } as const;
const trackPoint = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>|<trkpt\b([^>]*)\/>/g;
const attribute = (attributes: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`).exec(attributes)?.[1];
const child = (body: string, name: string) =>
  new RegExp(`<${name}\\b[^>]*>([^<]*)<\\/${name}>`).exec(body)?.[1]?.trim();
// A time without a zone would be read in the importer's local zone, so the
// same file could yield different instants on different devices.
const zoned = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/;

export type GpxTrack = {
  name: string | null;
  points: TrackPoint[];
  /** Points dropped for a missing or unusable position or time. */
  skipped: number;
  /** How many of those had a time with no zone. */
  zoneless: number;
};

export function parseGpx(text: string): GpxTrack {
  if (typeof text !== "string" || text.length > gpxLimits.bytes)
    throw new Error("GPX file is missing or larger than 25 MB.");
  if (!/<gpx\b/i.test(text)) throw new Error("Not a GPX file.");
  const name =
    /<trk\b[^>]*>[\s\S]*?<name\b[^>]*>([^<]*)<\/name>/
      .exec(text)?.[1]
      ?.trim() ?? null;
  const points: TrackPoint[] = [];
  let skipped = 0;
  let zoneless = 0;
  for (const match of text.matchAll(trackPoint)) {
    const attributes = match[1] ?? match[3] ?? "";
    const body = match[2] ?? "";
    const lat = Number(attribute(attributes, "lat"));
    const lon = Number(attribute(attributes, "lon"));
    const time = child(body, "time");
    if (time !== undefined && !zoned.test(time)) zoneless++;
    const at =
      time !== undefined && zoned.test(time) ? Date.parse(time) : Number.NaN;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !Number.isFinite(at)
    ) {
      skipped++;
      continue;
    }
    if (points.length >= gpxLimits.points)
      throw new Error("GPX track has more than 250,000 timed points.");
    const previous = points.at(-1);
    if (previous && at <= previous.at) {
      skipped++;
      continue;
    }
    points.push({ at, lon, lat });
  }
  if (points.length < 2)
    throw new Error(
      zoneless > 0
        ? "GPX times have no time zone; export with UTC (Z) or offset timestamps."
        : skipped > 0
          ? "GPX track has no usable timed points; recordings need a time on each point."
          : "GPX file contains no track points.",
    );
  return { name, points, skipped, zoneless };
}
