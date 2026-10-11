import { describe, expect, it } from "vitest";
import { forecastSnapshot } from "@scout/contracts";
import { recorded } from "@scout/testing";
import { normalizeForecast } from "./weather";

// The provider path parses a recorded two-point live response end to end.
describe("recorded provider forecast", () => {
  const fixture = recorded().forecastIso;
  const times = fixture[0]!.hourly.time as string[];
  const request = {
    points: [
      [-0.12, 51.5],
      [-0.12, 51.51],
    ] as [number, number][],
    window: {
      startAt: `${times[0]}:00Z`,
      endAt: new Date(Date.parse(`${times.at(-1)}:00Z`) + 3_600_000)
        .toISOString()
        .replace(".000", ""),
    },
  };
  it("normalises into schema-valid fresh snapshots with attribution", () => {
    const retrievedMs = Date.parse(request.window.startAt) - 60_000;
    const snapshots = normalizeForecast(fixture, request, retrievedMs, "live");
    expect(snapshots).toHaveLength(2);
    for (const snapshot of snapshots) {
      expect(forecastSnapshot.safeParse(snapshot).success).toBe(true);
      expect(snapshot.hours).toHaveLength(times.length);
      expect(
        snapshot.hours.every(
          (h) => h.windSpeedMps !== null && h.temperatureC !== null,
        ),
      ).toBe(true);
      expect(snapshot.attribution.url).toBe("https://open-meteo.com/");
      expect(snapshot.metadata.utcOffsetSeconds).toBe(0);
    }
    expect(snapshots[1]!.metadata.elevationM).toBe(31);
  });
});
