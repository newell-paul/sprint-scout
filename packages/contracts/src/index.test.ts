import { describe, expect, it } from "vitest";
import {
  attribution,
  coordinate,
  displayZone,
  errorCode,
  forecastWindow,
  plannerRequest,
  provenance,
  utcInstant,
} from "./index";

const source = {
  sourceKind: "synthetic",
  sourceId: "demo-v1",
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
const window = {
  startAt: "2026-09-10T09:00:00Z",
  endAt: "2026-09-10T12:00:00Z",
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

describe("forecast windows", () => {
  it("accepts a positive window up to 48 hours", () => {
    expect(forecastWindow.safeParse(window).success).toBe(true);
    expect(
      forecastWindow.safeParse({
        startAt: window.startAt,
        endAt: "2026-09-12T09:00:00Z",
      }).success,
    ).toBe(true);
  });
  it.each([
    ["empty", { startAt: window.startAt, endAt: window.startAt }],
    ["reversed", { startAt: window.endAt, endAt: window.startAt }],
    [
      "over 48 hours",
      { startAt: window.startAt, endAt: "2026-09-12T09:00:01Z" },
    ],
  ])("rejects a %s window", (_, value) => {
    expect(forecastWindow.safeParse(value).success).toBe(false);
  });
});

describe("planner request", () => {
  it("defaults the scenario to normal", () => {
    expect(
      plannerRequest.parse({
        date: "2026-09-08",
        startTime: "16:00",
        endTime: "20:00",
        timeZone: "Europe/London",
        segmentIds: ["demo-north"],
      }).scenario,
    ).toBe("normal");
  });
  it("rejects unknown segments and malformed times", () => {
    const base = {
      date: "2026-09-08",
      startTime: "16:00",
      endTime: "20:00",
      timeZone: "Europe/London",
      segmentIds: [],
    };
    expect(
      plannerRequest.safeParse({ ...base, segmentIds: ["queens-road"] })
        .success,
    ).toBe(false);
    expect(
      plannerRequest.safeParse({ ...base, startTime: "4pm" }).success,
    ).toBe(false);
    expect(
      plannerRequest.safeParse({ ...base, date: "08/09/2026" }).success,
    ).toBe(false);
  });
});

describe("display zone", () => {
  it.each(["Europe/London", "UTC", "Pacific/Auckland"])(
    "accepts the IANA zone %s",
    (zone) => {
      expect(displayZone.safeParse(zone).success).toBe(true);
    },
  );
  it.each(["+01:00", "-05:00", "Mars/Olympus", ""])(
    "rejects the display zone %j",
    (zone) => {
      expect(displayZone.safeParse(zone).success).toBe(false);
    },
  );
});

describe("error contracts", () => {
  it("keeps the published error code list stable", () => {
    expect(errorCode.options).toEqual([
      "AUTH_REQUIRED",
      "SOURCE_NOT_PERMITTED",
      "CAPABILITY_UNAVAILABLE",
      "GEOMETRY_INVALID",
      "FORECAST_UNAVAILABLE",
      "OUTSIDE_FORECAST_RANGE",
      "RATE_LIMITED",
      "INSUFFICIENT_HISTORY",
    ]);
  });
});
