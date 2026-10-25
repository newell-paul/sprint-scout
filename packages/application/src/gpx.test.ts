import { describe, expect, it } from "vitest";
import { gpxLimits, parseGpx } from "./gpx";

const gpx = (body: string, name = "Morning ride") =>
  `<?xml version="1.0"?><gpx version="1.1" creator="test"><trk><name>${name}</name><trkseg>${body}</trkseg></trk></gpx>`;
const point = (lat: number, lon: number, time: string, extra = "") =>
  `<trkpt lat="${lat}" lon="${lon}"><ele>12</ele><time>${time}</time>${extra}</trkpt>`;

describe("GPX reader", () => {
  it("reads timed track points in order with the track name", () => {
    const track = parseGpx(
      gpx(
        point(51.5, -0.12, "2026-09-12T09:00:00Z") +
          point(
            51.501,
            -0.12,
            "2026-09-12T09:00:05Z",
            "<extensions><power>250</power></extensions>",
          ) +
          `<trkpt lon="-0.12" lat="51.502"><time>2026-09-12T09:00:10.500Z</time></trkpt>`,
      ),
    );
    expect(track.name).toBe("Morning ride");
    expect(track.points).toEqual([
      { at: Date.parse("2026-09-12T09:00:00Z"), lon: -0.12, lat: 51.5 },
      { at: Date.parse("2026-09-12T09:00:05Z"), lon: -0.12, lat: 51.501 },
      { at: Date.parse("2026-09-12T09:00:10.500Z"), lon: -0.12, lat: 51.502 },
    ]);
  });
  it("skips points without a time or with a time that does not advance", () => {
    const track = parseGpx(
      gpx(
        point(51.5, -0.12, "2026-09-12T09:00:00Z") +
          `<trkpt lat="51.5005" lon="-0.12"><ele>1</ele></trkpt>` +
          point(51.501, -0.12, "2026-09-12T09:00:00Z") +
          point(51.502, -0.12, "2026-09-12T09:00:02Z"),
      ),
    );
    expect(track.points.map((p) => p.lat)).toEqual([51.5, 51.502]);
    expect(track.skipped).toBe(2);
    expect(track.zoneless).toBe(0);
  });
  it("counts points dropped for a time without a zone", () => {
    const track = parseGpx(
      gpx(
        point(51.5, -0.12, "2026-09-12T09:00:00Z") +
          point(51.5005, -0.12, "2026-09-12T09:00:01") +
          point(51.501, -0.12, "2026-09-12T09:00:02Z"),
      ),
    );
    expect(track.points).toHaveLength(2);
    expect(track.skipped).toBe(1);
    expect(track.zoneless).toBe(1);
  });
  it("rejects files that are not GPX, have no points or have no timed points", () => {
    expect(() => parseGpx("<html></html>")).toThrow("Not a GPX file.");
    expect(() => parseGpx(gpx(""))).toThrow("no track points");
    expect(() =>
      parseGpx(gpx(`<trkpt lat="1" lon="1"/><trkpt lat="1" lon="2"/>`)),
    ).toThrow("no usable timed points");
    expect(() => parseGpx("x".repeat(gpxLimits.bytes + 1))).toThrow("25 MB");
  });
  it("requires a time zone on every timestamp and honours offsets", () => {
    expect(() =>
      parseGpx(
        gpx(
          point(51.5, -0.12, "2026-10-25T01:30:00") +
            point(51.501, -0.12, "2026-10-25T01:30:05"),
        ),
      ),
    ).toThrow("no time zone");
    const track = parseGpx(
      gpx(
        point(51.5, -0.12, "2026-09-12T10:00:00+01:00") +
          point(51.501, -0.12, "2026-09-12T10:00:05+01:00") +
          point(51.502, -0.12, "2026-09-12T10:00:10"),
      ),
    );
    expect(track.points.map((p) => p.at)).toEqual([
      Date.parse("2026-09-12T09:00:00Z"),
      Date.parse("2026-09-12T09:00:05Z"),
    ]);
  });
  it("caps the number of points", () => {
    const body = Array.from({ length: gpxLimits.points + 1 }, (_, i) =>
      point(
        51.5,
        -0.12,
        new Date(Date.UTC(2026, 8, 12, 0, 0, 0) + i * 1000).toISOString(),
      ),
    ).join("");
    expect(() => parseGpx(gpx(body))).toThrow("250,000");
  });
  it("returns a null name when the track is unnamed", () => {
    expect(
      parseGpx(
        `<gpx><trk><trkseg>${point(51.5, -0.12, "2026-09-12T09:00:00Z")}${point(51.501, -0.12, "2026-09-12T09:00:01Z")}</trkseg></trk></gpx>`,
      ).name,
    ).toBeNull();
  });
  it("rejects a track point that is never closed", () => {
    const unclosed = `<trkpt lat="51.5" lon="-0.12"><time>2026-09-12T08:59:00Z</time>`;
    for (const body of [
      unclosed,
      unclosed +
        point(51.5, -0.12, "2026-09-12T09:00:00Z") +
        point(51.501, -0.12, "2026-09-12T09:00:05Z"),
      `<trkpt lat="51.5" lon="-0.12"`,
    ])
      expect(() => parseGpx(gpx(body))).toThrow(
        "GPX file has a track point that is not closed.",
      );
  });
  it("rejects many unclosed track points without rescanning the file", () => {
    const text = gpx(`<trkpt lat="51.5" lon="-0.12">`.repeat(200_000));
    const started = performance.now();
    expect(() => parseGpx(text)).toThrow("not closed");
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
