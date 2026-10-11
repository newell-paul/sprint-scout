import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Temporal } from "@js-temporal/polyfill";
import {
  formatLocalInstant,
  resolveLocalWindow,
  resolveRelativeDate,
  TimeResolutionError,
} from "./time";

const runs = { numRuns: 300, seed: Number(process.env.FC_SEED ?? 20260913) };
const zones = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Santiago",
  "Australia/Sydney",
  "Australia/Lord_Howe",
  "Pacific/Auckland",
  "Asia/Kolkata",
  "Asia/Tokyo",
];
const zone = fc.constantFrom(...zones);
const two = (n: number) => String(n).padStart(2, "0");
const date = fc
  .integer({ min: 0, max: 364 })
  .map((day) =>
    Temporal.PlainDate.from("2026-01-01").add({ days: day }).toString(),
  );
const time = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${two(h)}:${two(m)}`);
const choice = fc.constantFrom(undefined, "earlier" as const, "later" as const);
const codes = new Set([
  "INVALID_LOCAL_TIME",
  "NONEXISTENT_LOCAL_TIME",
  "AMBIGUOUS_LOCAL_TIME",
  "INVALID_WINDOW",
]);

describe("local window resolution across zones", () => {
  it("round-trips every resolved instant back to the requested wall clock", () => {
    fc.assert(
      fc.property(
        date,
        time,
        time,
        zone,
        choice,
        choice,
        (day, startTime, endTime, timeZone, startChoice, endChoice) => {
          let window;
          try {
            window = resolveLocalWindow({
              date: day,
              startTime,
              endTime,
              timeZone,
              ...(startChoice === undefined ? {} : { startChoice }),
              ...(endChoice === undefined ? {} : { endChoice }),
            });
          } catch (error) {
            return (
              error instanceof TimeResolutionError && codes.has(error.code)
            );
          }
          const start = formatLocalInstant(window.startAt, timeZone);
          const end = formatLocalInstant(window.endAt, timeZone);
          const endDay =
            endTime < startTime
              ? Temporal.PlainDate.from(day).add({ days: 1 }).toString()
              : day;
          const span = Date.parse(window.endAt) - Date.parse(window.startAt);
          return (
            start.startsWith(`${day}T${startTime}`) &&
            end.startsWith(`${endDay}T${endTime}`) &&
            span > 0 &&
            span <= 48 * 3_600_000
          );
        },
      ),
      runs,
    );
  });
  it("puts tomorrow exactly one calendar day after today in every zone", () => {
    const now = fc
      .integer({ min: 0, max: 365 * 24 * 60 })
      .map((minutes) =>
        Temporal.Instant.from("2026-01-01T00:00:00Z")
          .add({ minutes })
          .toString({ smallestUnit: "second" }),
      );
    fc.assert(
      fc.property(now, zone, (at, timeZone) => {
        const today = Temporal.PlainDate.from(
          resolveRelativeDate("today", timeZone, at),
        );
        const tomorrow = Temporal.PlainDate.from(
          resolveRelativeDate("tomorrow", timeZone, at),
        );
        return today.add({ days: 1 }).equals(tomorrow);
      }),
      runs,
    );
  });
  it("rejects unknown relative days and zones with the documented code", () => {
    expect(() =>
      resolveRelativeDate("yesterday" as never, "UTC", "2026-09-10T10:00:00Z"),
    ).toThrow("INVALID_LOCAL_TIME");
    expect(() =>
      resolveRelativeDate("today", "Mars/Olympus", "2026-09-10T10:00:00Z"),
    ).toThrow("INVALID_LOCAL_TIME");
  });
});
