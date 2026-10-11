import { describe, expect, it } from "vitest";
import { thumbnailPath, thumbnailPoints } from "./thumbnail";

describe("route thumbnail", () => {
  it("fits a route inside the box with north up", () => {
    const pts = thumbnailPoints(
      [
        [0, 51],
        [0, 51.01],
      ],
      32,
      4,
    );
    expect(pts[0]![1]).toBeCloseTo(28);
    expect(pts[1]![1]).toBeCloseTo(4);
    expect(pts[0]![0]).toBeCloseTo(16);
  });
  it("preserves aspect by scaling longitude at the mean latitude", () => {
    const pts = thumbnailPoints(
      [
        [0, 60],
        [0.02, 60],
        [0.02, 60.01],
      ],
      32,
      4,
    );
    const width = pts[1]![0] - pts[0]![0];
    const height = pts[1]![1] - pts[2]![1];
    expect(width / height).toBeCloseTo(1, 1);
  });
  it("handles degenerate and empty input", () => {
    expect(thumbnailPoints([], 32, 4)).toEqual([]);
    const same = thumbnailPoints([[1, 1]], 32, 4);
    expect(same[0]).toEqual([16, 16]);
    expect(thumbnailPath([[1, 2]])).toBe("M1.0 2.0");
  });
});
