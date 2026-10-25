// Minimal GPX track reader for files exported from a ride recorder. It reads
// <trkpt> elements only, never network or extensions, and stays bounded.
import type { TrackPoint } from "@scout/analysis/effort-match";

export const gpxLimits = { bytes: 25_000_000, points: 250_000 } as const;
const trackOpen = /<trkpt\b/g;
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

// Every search starts where the last one ended, so an unclosed point cannot make
// the reader rescan the rest of the file for each opening tag.
function* trackPoints(text: string) {
  const notClosed = () =>
    new Error("GPX file has a track point that is not closed.");
  const open = new RegExp(trackOpen);
  for (let match = open.exec(text); match; match = open.exec(text)) {
    const start = open.lastIndex;
    const tagEnd = text.indexOf(">", start);
    if (tagEnd === -1) throw notClosed();
    if (text[tagEnd - 1] === "/") {
      yield { attributes: text.slice(start, tagEnd - 1), body: "" };
      open.lastIndex = tagEnd + 1;
      continue;
    }
    const close = text.indexOf("</trkpt>", tagEnd);
    const next = new RegExp(trackOpen);
    next.lastIndex = tagEnd;
    const nested = next.exec(text);
    if (close === -1 || (nested && nested.index < close)) throw notClosed();
    yield {
      attributes: text.slice(start, tagEnd),
      body: text.slice(tagEnd + 1, close),
    };
    open.lastIndex = close + "</trkpt>".length;
  }
}

export function parseGpx(text: string): GpxTrack {
  // A file within the byte limit never decodes to more UTF-16 units than bytes,
  // so this backstop agrees with the importer's size check.
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
  for (const { attributes, body } of trackPoints(text)) {
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
