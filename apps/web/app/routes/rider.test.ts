import { describe, expect, it } from "vitest";
import {
  parseRiderField,
  readRiderInput,
  referenceInput,
  resolveRider,
} from "./rider";
describe("rider profile storage", () => {
  it("reads only complete in-range profiles", () => {
    expect(readRiderInput(null)).toBeNull();
    expect(readRiderInput("not json")).toBeNull();
    expect(readRiderInput(JSON.stringify({ powerW: 250 }))).toBeNull();
    expect(
      readRiderInput(JSON.stringify({ powerW: 5, massKg: 80, cdaM2: 0.3 })),
    ).toBeNull();
    expect(
      readRiderInput(
        JSON.stringify({ powerW: 250, massKg: 80, cdaM2: 0.3, extra: 1 }),
      ),
    ).toEqual({ powerW: 250, massKg: 80, cdaM2: 0.3 });
  });
  it("falls back to the reference rider and parses bounded fields", () => {
    expect(resolveRider(null).calmSpeedKmh).toBe(40);
    expect(resolveRider(referenceInput).calmSpeedKmh).toBeCloseTo(40, 1);
    expect(
      resolveRider({ powerW: 350, massKg: 80, cdaM2: 0.3 }).calmSpeedKmh,
    ).toBeGreaterThan(40);
    expect(parseRiderField("powerW", " 260.4 ")).toBe(260);
    expect(parseRiderField("powerW", "")).toBeNull();
    expect(parseRiderField("powerW", "abc")).toBeNull();
    expect(parseRiderField("massKg", "30")).toBeNull();
    expect(parseRiderField("cdaM2", "0.2849")).toBe(0.285);
    expect(parseRiderField("cdaM2", "0.9")).toBeNull();
  });
});
