import { describe, expect, it } from "vitest";
import { attribution, coordinate, provenance, utcInstant } from "./index";

const source = {
  sourceKind: "synthetic",
  sourceId: "fixture-v1",
  retrievedAt: "2026-09-10T06:00:00Z",
  expiresAt: null,
  policy: {
    analysis: true,
    persistence: true,
    derivedOutputs: true,
    aiDisclosure: true,
    decisionId: "synthetic-v1",
  },
};

describe("instants and coordinates", () => {
  it.each(["2026-09-10T09:00:00Z", "2026-12-31T23:59:59Z"])(
    "accepts the UTC instant %s",
    (value) => {
      expect(utcInstant.safeParse(value).success).toBe(true);
    },
  );
  it.each([
    "2026-09-10T09:00:00",
    "2026-09-10T09:00:00+01:00",
    "2026-09-10T09:00:00.000Z",
    "2026-09-10",
    "now",
  ])("rejects the non-UTC instant %s", (value) => {
    expect(utcInstant.safeParse(value).success).toBe(false);
  });
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

describe("provenance and attribution", () => {
  it("round-trips a synthetic source unchanged", () => {
    expect(provenance.parse(source)).toEqual(source);
  });
  it("rejects unknown keys so transport metadata cannot smuggle rights", () => {
    expect(provenance.safeParse({ ...source, owner: "me" }).success).toBe(
      false,
    );
    expect(
      provenance.safeParse({
        ...source,
        policy: { ...source.policy, admin: true },
      }).success,
    ).toBe(false);
  });
  it("requires valid attribution URLs", () => {
    const valid = {
      label: "Open-Meteo",
      url: "https://open-meteo.com/",
      licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
      changes: "none",
    };
    expect(attribution.safeParse(valid).success).toBe(true);
    expect(
      attribution.safeParse({ ...valid, url: "open-meteo.com" }).success,
    ).toBe(false);
  });
});
