import { expect, it } from "vitest";
import { formatDuration, formatTimeDifference, formatZonedTime } from "./time";

it("formats rounded durations across minute and hour boundaries", () => {
  expect(formatDuration(90)).toBe("1m 30s");
  expect(formatDuration(59.6)).toBe("1m 00s");
  expect(formatDuration(3599.6)).toBe("1h 00m 00s");
  expect(formatDuration(0)).toBe("0s");
  expect(formatDuration(Infinity)).toBe("Unavailable");
  expect(formatDuration(-1)).toBe("Unavailable");
});

it("labels saved and lost time without a misleading negative zero", () => {
  expect(formatTimeDifference(-12.2)).toBe("12s quicker than still air");
  expect(formatTimeDifference(65.1)).toBe("1m 05s slower than still air");
  expect(formatTimeDifference(-0.1)).toContain("Same time");
});

// The server and the browser ship different ICU data ("Sept" against "Sep",
// "," against " at"), so the planner text must not come from locale patterns.
it("formats a zoned time the same way whatever ICU data the runtime has", () => {
  expect(formatZonedTime("2026-09-08T15:00:00Z", "Europe/London")).toBe(
    "08 Sep, 16:00 GMT+1",
  );
  expect(formatZonedTime("2026-03-29T00:30:00Z", "Europe/London")).toBe(
    "29 Mar, 00:30 GMT",
  );
  expect(formatZonedTime("2026-01-01T23:05:00Z", "Asia/Kolkata")).toBe(
    "02 Jan, 04:35 GMT+5:30",
  );
});
