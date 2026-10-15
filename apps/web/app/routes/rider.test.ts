import { describe, expect, it } from "vitest";
import { riderStorageFixtures } from "@scout/testing/storage";
import {
  parseRiderField,
  readRiderInput,
  referenceInput,
  resolveRider,
  riderStorageValue,
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
  it("reads every shipped rider shape", () => {
    for (const raw of Object.values(riderStorageFixtures))
      expect(readRiderInput(raw)).not.toBeNull();
  });
  // docs/test-strategy.md: unknown fields survive a round-trip, so a newer
  // version's fields are not lost when an older build saves the profile.
  it("keeps unknown stored fields when the profile is saved", () => {
    const stored = JSON.stringify({
      ...JSON.parse(riderStorageFixtures.v1),
      future: { kept: true },
    });
    const saved = riderStorageValue(stored, {
      powerW: 300,
      massKg: 75,
      cdaM2: 0.28,
    });
    expect(JSON.parse(saved)).toEqual({
      powerW: 300,
      massKg: 75,
      cdaM2: 0.28,
      future: { kept: true },
    });
    expect(readRiderInput(saved)).toEqual({
      powerW: 300,
      massKg: 75,
      cdaM2: 0.28,
    });
  });
  it("saves only the profile when nothing readable was stored", () => {
    const input = { powerW: 300, massKg: 75, cdaM2: 0.28 };
    for (const previous of [null, "not json", "[1]", "null"])
      expect(JSON.parse(riderStorageValue(previous, input))).toEqual(input);
  });
});
