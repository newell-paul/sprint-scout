import { expect, it } from "vitest";
import { compassDirection, formatSpeed } from "./speed";
it("converts display units without changing wind directions", () => {
  expect(formatSpeed(5)).toBe("18.0 km/h");
  expect(formatSpeed(5, "mph")).toBe("11.2 mph");
  expect(formatSpeed(0, "mph")).toBe("0.0 mph");
  expect(compassDirection(359)).toBe("north");
  expect(compassDirection(90)).toBe("east");
  expect(compassDirection(225)).toBe("south-west");
});
