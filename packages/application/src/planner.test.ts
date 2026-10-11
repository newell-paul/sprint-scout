import { expect, it } from "vitest";
import { defaultPlannerRequest, plannerResponse } from "@scout/contracts";
import { getPlannerData } from "./planner";
import { estimateDeparture } from "./departure";
it("returns shared hourly results, bounded geometry, attribution and best-hour references", async () => {
  const result = await getPlannerData(defaultPlannerRequest);
  expect(plannerResponse.safeParse(result).success).toBe(true);
  expect(result.hourly).toHaveLength(8);
  expect(result.errors).toEqual([]);
  for (const key of result.best)
    expect(
      result.hourly.some(
        (r) => r.segmentId === key.segmentId && r.attemptAt === key.attemptAt,
      ),
    ).toBe(true);
  expect(
    result.segments.every((s) => s.gradePct === null && s.lengthM > 0),
  ).toBe(true);
  expect(result.attribution[0]!.url).toBe("https://open-meteo.com/");
  const north = result.hourly.find(
    (r) =>
      r.segmentId === "demo-north" && r.attemptAt === "2026-09-08T17:00:00Z",
  )!;
  expect(north.legs[0]!.windBearingDegrees).toBeCloseTo(0, 6);
  expect(north.prediction).toBeNull();
});
it("keeps synthetic weather deterministic across overlapping query windows", async () => {
  const a = await getPlannerData(defaultPlannerRequest),
    b = await getPlannerData({ ...defaultPlannerRequest, startTime: "17:00" });
  expect(b.hourly).toEqual(
    a.hourly.filter((r) => r.attemptAt >= "2026-09-08T16:00:00Z"),
  );
});
it("supports empty selection, unavailable coverage, missing fields, partial and stale failures", async () => {
  expect(
    (await getPlannerData({ ...defaultPlannerRequest, segmentIds: [] })).hourly,
  ).toEqual([]);
  expect(
    (await getPlannerData({ ...defaultPlannerRequest, date: "2026-09-20" }))
      .best,
  ).toEqual([]);
  const incomplete = await getPlannerData({
    ...defaultPlannerRequest,
    scenario: "incomplete",
  });
  expect(incomplete.hourly[0]!.gustMps).toBeNull();
  expect(incomplete.hourly[0]!.warnings).toContain("INCOMPLETE_WEATHER");
  const partial = await getPlannerData({
    ...defaultPlannerRequest,
    scenario: "partial",
  });
  expect(partial.best).toHaveLength(1);
  expect(partial.errors[0]!.segmentId).toBe("demo-bend");
  for (const scenario of ["outage", "stale"]) {
    const result = await getPlannerData({ ...defaultPlannerRequest, scenario });
    expect(result.best).toEqual([]);
    expect(result.status).toBe(scenario === "stale" ? "stale" : "unavailable");
  }
});
it("rejects unknown routes and forwards invalid/DST windows as explicit errors", async () => {
  await expect(
    getPlannerData({
      ...defaultPlannerRequest,
      segmentIds: ["real-strava-route"],
    }),
  ).rejects.toThrow();
  await expect(
    getPlannerData({
      ...defaultPlannerRequest,
      date: "2026-03-29",
      startTime: "01:30",
    }),
  ).rejects.toThrow("NONEXISTENT_LOCAL_TIME");
  await expect(
    getPlannerData({
      ...defaultPlannerRequest,
      date: "2026-10-25",
      startTime: "01:30",
    }),
  ).rejects.toThrow("AMBIGUOUS_LOCAL_TIME");
});
it("estimates departure across midnight from explicit durations, with bounded values", () => {
  expect(estimateDeparture("2026-09-08T00:10:00Z", 20, 10).departureAt).toBe(
    "2026-09-07T23:40:00Z",
  );
  expect(estimateDeparture("2026-09-08T17:00:00Z", 0, 0).departureAt).toBe(
    "2026-09-08T17:00:00Z",
  );
  for (const [approach, warmup] of [
    [-1, 0],
    [361, 0],
    [0, 121],
    [1.5, 0],
    [NaN, 0],
  ])
    expect(() =>
      estimateDeparture("2026-09-08T17:00:00Z", approach!, warmup!),
    ).toThrow();
});
