import { describe, expect, it } from "vitest";
import { coordinate, lineString } from "./index";
import { z } from "zod";

describe("coordinates", () => {
  it.each([
    [[-180, -90], true],
    [[180, 90], true],
    [[180.1, 0], false],
    [[0, -90.1], false],
    [[0], false],
    [[0, 0, 0], false],
  ])("validates coordinate %j as %s", (value, valid) => {
    expect(coordinate.safeParse(value).success).toBe(valid);
  });
});

describe("line strings", () => {
  it("need two to 10,000 valid coordinates and nothing else", () => {
    const line = {
      type: "LineString",
      coordinates: [
        [0, 51],
        [0, 51.01],
      ],
    };
    expect(lineString.safeParse(line).success).toBe(true);
    expect(
      lineString.safeParse({ ...line, coordinates: [[0, 51]] }).success,
    ).toBe(false);
    expect(lineString.safeParse({ ...line, crs: "x" }).success).toBe(false);
  });
});

describe("zod configuration", () => {
  it("never compiles parsers with eval, so the published policy needs none", () => {
    expect(z.config().jitless).toBe(true);
  });
});
