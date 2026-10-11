import { it, expect } from "vitest";
import { createApp } from "./app";
it("serves health and synthetic segments without providers or credentials", async () => {
  const app = createApp();
  try {
    for (const url of ["/health/live", "/health/ready", "/segments"]) {
      const res = await app.inject({ url });
      expect(res.statusCode).toBe(200);
      expect(res.json().mode).toBe("demo");
    }
    expect((await app.inject({ url: "/strava" })).statusCode).toBe(404);
  } finally {
    await app.close();
  }
});

it("returns explicitly synthetic forecast data, freshness and attribution", async () => {
  const app = createApp();
  try {
    const response = await app.inject({ url: "/weather/demo" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.mode).toBe("demo");
    expect(body.fixtureClock).toBe("2026-09-07T12:00:00Z");
    expect(body.weather.status).toBe("fresh");
    expect(body.weather.snapshots[0].attribution.url).toBe(
      "https://open-meteo.com/",
    );
    expect(body.errors).toEqual([]);
  } finally {
    await app.close();
  }
});

it("serves the same planner contract through the API and rejects unknown inputs", async () => {
  const app = createApp();
  try {
    const payload = {
      date: "2026-09-08",
      startTime: "16:00",
      endTime: "20:00",
      timeZone: "Europe/London",
      segmentIds: ["demo-north", "demo-bend"],
      scenario: "normal",
    };
    const response = await app.inject({
      method: "POST",
      url: "/planner/demo",
      payload,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().hourly).toHaveLength(8);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/planner/demo",
          payload: { ...payload, athleteId: "someone" },
        })
      ).statusCode,
    ).toBe(400);
  } finally {
    await app.close();
  }
});
it("keeps the published route table stable", async () => {
  const app = createApp();
  try {
    await app.ready();
    await expect(app.printRoutes({ commonPrefix: false })).toMatchFileSnapshot(
      "../fixtures/routes.contract.txt",
    );
  } finally {
    await app.close();
  }
});
