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
// Uniform days almost never land on a clock change, so transition days and
// small hours are drawn on purpose alongside them.
const transitions = [
  "2026-03-08",
  "2026-03-29",
  "2026-04-05",
  "2026-09-06",
  "2026-09-27",
  "2026-10-04",
  "2026-10-25",
  "2026-11-01",
];
const date = fc.oneof(
  fc
    .integer({ min: 0, max: 364 })
    .map((day) =>
      Temporal.PlainDate.from("2026-01-01").add({ days: day }).toString(),
    ),
  fc.constantFrom(...transitions),
);
const time = fc
  .tuple(
    fc.oneof(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 3 })),
    fc.integer({ min: 0, max: 59 }),
  )
  .map(([h, m]) => `${two(h)}:${two(m)}`);
const choice = fc.constantFrom(undefined, "earlier" as const, "later" as const);
type Code = TimeResolutionError["code"];

// An oracle built only from instant-to-wall-clock conversions, independent of
// the local-to-instant disambiguation the code under test uses.
function occurrences(day: string, hm: string, timeZone: string) {
  const local = Temporal.PlainDateTime.from(`${day}T${hm}`);
  const asUtc = local.toZonedDateTime("UTC").toInstant();
  const offsets = new Set(
    [-1, 0, 1].map(
      (d) =>
        asUtc.add({ hours: 24 * d }).toZonedDateTimeISO(timeZone)
          .offsetNanoseconds,
    ),
  );
  return [...offsets]
    .map((o) =>
      Temporal.Instant.fromEpochNanoseconds(asUtc.epochNanoseconds - BigInt(o)),
    )
    .filter((i) =>
      i.toZonedDateTimeISO(timeZone).toPlainDateTime().equals(local),
    )
    .sort(Temporal.Instant.compare);
}
function expectedPoint(
  day: string,
  hm: string,
  timeZone: string,
  pick: "earlier" | "later" | undefined,
): Temporal.Instant | Code {
  const found = occurrences(day, hm, timeZone);
  if (found.length === 0) return "NONEXISTENT_LOCAL_TIME";
  if (found.length > 1 && pick === undefined) return "AMBIGUOUS_LOCAL_TIME";
  return pick === "later" ? found.at(-1)! : found[0]!;
}

type Fold = "earlier" | "later" | undefined;
function expectOracle(
  day: string,
  startTime: string,
  endTime: string,
  timeZone: string,
  startChoice: Fold,
  endChoice: Fold,
) {
  const endDay =
    endTime < startTime
      ? Temporal.PlainDate.from(day).add({ days: 1 }).toString()
      : day;
  const start = expectedPoint(day, startTime, timeZone, startChoice);
  const end = expectedPoint(endDay, endTime, timeZone, endChoice);
  let expected: Code | { startAt: string; endAt: string };
  if (startTime === endTime) expected = "INVALID_WINDOW";
  else if (typeof start === "string") expected = start;
  else if (typeof end === "string") expected = end;
  else {
    const span = end.epochMilliseconds - start.epochMilliseconds;
    expected =
      span > 0 && span <= 48 * 3_600_000
        ? {
            startAt: start.toString({ smallestUnit: "second" }),
            endAt: end.toString({ smallestUnit: "second" }),
          }
        : "INVALID_WINDOW";
  }
  let actual: Code | { startAt: string; endAt: string };
  try {
    const window = resolveLocalWindow({
      date: day,
      startTime,
      endTime,
      timeZone,
      ...(startChoice === undefined ? {} : { startChoice }),
      ...(endChoice === undefined ? {} : { endChoice }),
    });
    actual = { startAt: window.startAt, endAt: window.endAt };
    expect(formatLocalInstant(window.startAt, timeZone)).toMatch(
      new RegExp(`^${day}T${startTime}`),
    );
    expect(formatLocalInstant(window.endAt, timeZone)).toMatch(
      new RegExp(`^${endDay}T${endTime}`),
    );
  } catch (error) {
    if (!(error instanceof TimeResolutionError)) throw error;
    actual = error.code;
  }
  expect(actual).toEqual(expected);
}
// Every kind of clock change the zone list holds, so each code is always
// exercised whatever the random draw.
const changes: [string, string, string, string, Fold, Fold][] = [
  ["Europe/Berlin", "2026-03-29", "02:30", "05:00", undefined, undefined],
  ["Europe/Berlin", "2026-10-25", "02:30", "05:00", undefined, undefined],
  ["Europe/Berlin", "2026-10-25", "02:30", "05:00", "earlier", undefined],
  ["Europe/Berlin", "2026-10-25", "02:30", "05:00", "later", undefined],
  ["Europe/Berlin", "2026-10-25", "02:40", "02:50", "later", "earlier"],
  ["Europe/London", "2026-03-29", "00:30", "01:30", undefined, undefined],
  ["America/New_York", "2026-11-01", "00:15", "01:30", undefined, "later"],
  ["Australia/Sydney", "2026-10-04", "02:30", "06:00", undefined, undefined],
  ["Australia/Lord_Howe", "2026-10-04", "02:15", "06:00", undefined, undefined],
  ["Australia/Lord_Howe", "2026-04-05", "01:45", "06:00", undefined, undefined],
  ["Asia/Tokyo", "2026-03-29", "02:30", "02:30", undefined, undefined],
];

describe("local window resolution across zones", () => {
  it.each(changes)(
    "%s %s %s to %s (%s, %s) matches the oracle",
    (timeZone, day, startTime, endTime, startChoice, endChoice) =>
      expectOracle(day, startTime, endTime, timeZone, startChoice, endChoice),
  );
  it("resolves exactly the windows the oracle accepts and names the reason for the rest", () => {
    fc.assert(
      fc.property(
        date,
        time,
        time,
        zone,
        choice,
        choice,
        (day, startTime, endTime, timeZone, startChoice, endChoice) =>
          expectOracle(
            day,
            startTime,
            endTime,
            timeZone,
            startChoice,
            endChoice,
          ),
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
