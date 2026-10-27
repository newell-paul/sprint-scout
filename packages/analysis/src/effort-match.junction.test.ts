import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { matchEfforts, type TrackPoint } from "./effort-match";
import type { Coordinate } from "./index";

const runs = { numRuns: 120, seed: Number(process.env.FC_SEED ?? 20260913) };
// Paths are laid out in metres east and north of the segment's start.
const origin: Coordinate = [-0.12, 51.5];
const ky = 111_320;
const kx = ky * Math.cos((origin[1] * Math.PI) / 180);
type Metres = [number, number];
const toCoordinate = ([x, y]: Metres): Coordinate => [
  origin[0] + x / kx,
  origin[1] + y / ky,
];
// A 500 m segment drawn due north, its start and finish clicked on the
// centrelines of the cross roads at each end.
const lengthM = 500;
const segment = (
  [
    [0, 0],
    [0, 250],
    [0, lengthM],
  ] as Metres[]
).map(toCoordinate);

type Sampling = { speedMps?: number; intervalS?: number; phase?: number };
function ride(
  path: Metres[],
  { speedMps = 8, intervalS = 1, phase = 0 }: Sampling = {},
): TrackPoint[] {
  const legs = path.slice(1).map((b, i) => {
    const a = path[i]!;
    return { a, b, lengthM: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const totalM = legs.reduce((sum, leg) => sum + leg.lengthM, 0);
  const stepM = speedMps * intervalS;
  const track: TrackPoint[] = [];
  for (let d = phase * stepM, k = 0; d <= totalM; d += stepM, k++) {
    let rest = d;
    let leg = legs[0]!;
    for (leg of legs) {
      if (rest <= leg.lengthM) break;
      rest -= leg.lengthM;
    }
    const f = Math.min(1, rest / leg.lengthM);
    const [lon, lat] = toCoordinate([
      leg.a[0] + (leg.b[0] - leg.a[0]) * f,
      leg.a[1] + (leg.b[1] - leg.a[1]) * f,
    ]);
    track.push({
      at: Date.parse("2026-09-12T09:00:00Z") + k * intervalS * 1000,
      lon,
      lat,
    });
  }
  return track;
}

// Riders keep left, `lane` metres from the centreline. A near-side turn never
// crosses the other lane, so it joins a lane ahead of the start line and
// leaves a lane short of the finish line; a far-side turn crosses both lines.
const joinFrom = (side: "near" | "far", lane: number): Metres[] =>
  side === "near"
    ? [
        [-200, lane],
        [-lane, lane],
      ]
    : [
        [200, -lane],
        [-lane, -lane],
      ];
const leaveTo = (side: "near" | "far", lane: number): Metres[] =>
  side === "near"
    ? [
        [-lane, lengthM - lane],
        [-200, lengthM - lane],
      ]
    : [
        [-lane, lengthM + lane],
        [200, lengthM + lane],
      ];
const straight = (lane: number): Metres[] => [
  [-lane, -200],
  [-lane, lengthM + 200],
];

describe("efforts joined or left at a junction", () => {
  it("finds an effort that turns onto the segment at its start from the near side", () => {
    const path = [...joinFrom("near", 2), [-2, lengthM + 200] as Metres];
    const efforts = matchEfforts(segment, ride(path));
    expect(efforts).toHaveLength(1);
    expect(efforts[0]!.elapsedSeconds).toBeCloseTo(lengthM / 8, 0);
  });
  it("finds an effort that turns off the segment at its finish to the near side", () => {
    const path = [[-2, -200] as Metres, ...leaveTo("near", 2)];
    const efforts = matchEfforts(segment, ride(path));
    expect(efforts).toHaveLength(1);
    expect(efforts[0]!.elapsedSeconds).toBeCloseTo(lengthM / 8, 0);
  });
  it("finds a far-side join and exit recorded every 5 s at any sampling phase", () => {
    const path = [...joinFrom("far", 2), ...leaveTo("far", 2)];
    for (let phase = 0; phase < 1; phase += 0.1)
      expect(
        matchEfforts(segment, ride(path, { intervalS: 5, phase })),
      ).toHaveLength(1);
  });
  it("finds nothing for a ride that crosses the start's junction without turning onto the segment", () => {
    const across: Metres[] = [
      [-200, 2],
      [200, 2],
    ];
    expect(matchEfforts(segment, ride(across))).toEqual([]);
  });
  it("finds nothing for a recording that starts just past the start", () => {
    const late: Metres[] = [
      [-2, 3],
      [-2, lengthM + 200],
    ];
    expect(matchEfforts(segment, ride(late))).toEqual([]);
  });
  it("finds nothing for a recording that stops just short of the finish", () => {
    for (const stopM of [lengthM - 20, lengthM - 3])
      expect(
        matchEfforts(
          segment,
          ride([
            [-2, -200],
            [-2, stopM],
          ]),
        ),
      ).toEqual([]);
  });
  it("keeps the time of a ride straight through", () => {
    const efforts = matchEfforts(segment, ride(straight(2)));
    expect(efforts).toHaveLength(1);
    expect(efforts[0]!.elapsedSeconds).toBe(lengthM / 8);
  });
});

describe("junction invariants", () => {
  // Each gate times the pass at the closest approach to its point, which on a
  // corner sits up to the lane offset either side of the line.
  it("finds one effort for a join and exit from either side, timed within one sample interval plus the corners", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("near" as const, "far" as const),
        fc.constantFrom("near" as const, "far" as const),
        fc.double({ min: 0.5, max: 5, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.integer({ min: 1, max: 5 }),
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        (join, leave, lane, speedMps, intervalS, phase) => {
          const path = [...joinFrom(join, lane), ...leaveTo(leave, lane)];
          const efforts = matchEfforts(
            segment,
            ride(path, { speedMps, intervalS, phase }),
          );
          expect(efforts).toHaveLength(1);
          expect(
            Math.abs(efforts[0]!.elapsedSeconds - lengthM / speedMps),
          ).toBeLessThanOrEqual(intervalS + (4 * lane) / speedMps + 0.1);
        },
      ),
      runs,
    );
  });
});
