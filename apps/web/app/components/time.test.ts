import { expect, it } from "vitest";
import { formatDuration, formatTimeDifference } from "./time";

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
