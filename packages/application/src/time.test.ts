import { expect, it } from "vitest";
import {
  resolveLocalInstant,
  resolveLocalWindow,
  resolveRelativeDate,
  formatLocalInstant,
} from "./time";
it("rejects spring DST gaps even when a fold choice is supplied", () => {
  for (const choice of [undefined, "earlier", "later"] as const)
    expect(() =>
      resolveLocalInstant("2026-03-29", "01:30", "Europe/London", choice),
    ).toThrow("NONEXISTENT_LOCAL_TIME");
});
it("requires a choice for repeated hours and round-trips both offsets", () => {
  expect(() =>
    resolveLocalInstant("2026-10-25", "01:30", "Europe/London"),
  ).toThrow("AMBIGUOUS_LOCAL_TIME");
  const a = resolveLocalInstant(
    "2026-10-25",
    "01:30",
    "Europe/London",
    "earlier",
  );
  const b = resolveLocalInstant(
    "2026-10-25",
    "01:30",
    "Europe/London",
    "later",
  );
  expect(a).toBe("2026-10-25T00:30:00Z");
  expect(b).toBe("2026-10-25T01:30:00Z");
  expect(formatLocalInstant(a, "Europe/London")).toBe(
    "2026-10-25T01:30+01:00[Europe/London]",
  );
  expect(formatLocalInstant(b, "Europe/London")).toBe(
    "2026-10-25T01:30+00:00[Europe/London]",
  );
});
it("handles overnight windows, DST duration and non-whole-hour zones", () => {
  expect(
    resolveLocalWindow({
      date: "2026-09-07",
      startTime: "23:00",
      endTime: "01:00",
      timeZone: "Europe/London",
    }),
  ).toMatchObject({
    startAt: "2026-09-07T22:00:00Z",
    endAt: "2026-09-08T00:00:00Z",
  });
  const w = resolveLocalWindow({
    date: "2026-03-29",
    startTime: "00:00",
    endTime: "03:00",
    timeZone: "Europe/London",
  });
  expect(Date.parse(w.endAt) - Date.parse(w.startAt)).toBe(2 * 3600000);
  expect(resolveLocalInstant("2026-09-07", "16:00", "Asia/Kathmandu")).toBe(
    "2026-09-07T10:15:00Z",
  );
  expect(() =>
    resolveLocalWindow({
      date: "2026-09-07",
      startTime: "16:00",
      endTime: "16:00",
      timeZone: "UTC",
    }),
  ).toThrow("INVALID_WINDOW");
});
it("resolves tomorrow in the user zone, including local date/year boundaries", () => {
  expect(
    resolveRelativeDate("tomorrow", "Pacific/Auckland", "2026-12-31T12:00:00Z"),
  ).toBe("2027-01-02");
  expect(
    resolveRelativeDate("today", "America/Los_Angeles", "2026-09-07T01:00:00Z"),
  ).toBe("2026-09-06");
});
it("rejects invalid dates, times and zones", () => {
  for (const [date, time, zone] of [
    ["2026-02-30", "12:00", "UTC"],
    ["2026-09-07", "25:00", "UTC"],
    ["2026-09-07", "12:00", "invalid"],
    ["2026-09-07", "12:00", "+01:00"],
  ])
    expect(() => resolveLocalInstant(date!, time!, zone!)).toThrow(
      "INVALID_LOCAL_TIME",
    );
});
