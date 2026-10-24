import { describe, expect, it } from "vitest";
import { prepareGeometry } from "./index";

const line = {
  type: "LineString",
  coordinates: [
    [0, 51],
    [0, 51.0015],
  ],
};

describe("analysis error codes", () => {
  it("rejects a sampling distance outside 1 to 100 m", () => {
    for (const maxLegM of [0, 101, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => prepareGeometry(line, maxLegM)).toThrow(
        expect.objectContaining({ code: "GEOMETRY_INVALID" }),
      );
  });
});
