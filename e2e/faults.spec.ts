import { aRoute, drawSegment, expect, slider, test } from "./fixtures";

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

test.describe("forecast timeout", () => {
  test.use({ installClock: true });

  test("a forecast that never answers times out and try again recovers", async ({
    page,
    seed,
    openMeteo,
  }) => {
    openMeteo.faults.weather = "timeout";
    await seed(seeded);
    await expect(page.getByTestId("forecast-placeholder")).toBeVisible();
    await page.clock.runFor(12_500);
    await expect(page.locator("p[role=alert]")).toContainText(
      "Forecast request timed out or was cancelled.",
    );
    openMeteo.faults.weather = "ok";
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(slider(page)).toBeVisible();
    await expect(page.locator("p[role=alert]")).toHaveCount(0);
    expect(openMeteo.calls.weather).toBe(2);
  });
});

test("a rate-limited forecast says so and does not retry on its own", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "rateLimit";
  await seed(seeded);
  await expect(page.locator("p[role=alert]")).toContainText(
    "Weather service rate limit reached. Try again later.",
  );
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  expect(openMeteo.calls.weather).toBe(1);
});

test("an empty forecast body is reported as unusable", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "empty";
  await seed(seeded);
  await expect(page.locator("p[role=alert]")).toBeVisible();
  await expect(slider(page)).toHaveCount(0);
});

test("map tiles failing to load leaves the map usable", async ({
  page,
  seed,
  externalRequests,
}) => {
  await seed(seeded);
  await expect(
    page.getByRole("region", { name: "Route drawing map" }),
  ).toBeVisible();
  await expect(page.getByTestId("wind-map-overlay")).toBeVisible();
  await expect
    .poll(
      () =>
        externalRequests.filter((url) => url.includes("tile.openstreetmap.org"))
          .length,
    )
    .toBeGreaterThan(0);
});

test("a full storage quota refuses the save and preserves existing routes", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ id: "kept", name: "Kept segment" })] });
  await page.evaluate(() => {
    let index = 0;
    for (const size of [512 * 1024, 32 * 1024, 2 * 1024, 128, 8]) {
      const block = "x".repeat(size);
      try {
        for (let attempt = 0; attempt < 512; attempt++)
          localStorage.setItem(`filler-${index++}`, block);
      } catch {
        /* this block size no longer fits; try a smaller one */
      }
    }
  });
  await page.getByTestId("segment-slot-2").click();
  await page.getByText("Enter coordinates instead", { exact: true }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("51.5");
  await page.getByLabel("Longitude", { exact: true }).fill("-0.12");
  await page.getByRole("button", { name: "Add point and centre map" }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("51.51");
  await page.getByRole("button", { name: "Add point and centre map" }).click();
  await page.getByLabel("Route name", { exact: true }).fill("Will not fit");
  await page.getByRole("checkbox", { name: /created this route/ }).check();
  await page.getByRole("button", { name: "Save route", exact: true }).click();
  await expect(page.locator("p[role=status]")).toContainText(
    "Could not save changes. Storage may be full",
  );
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("filler-")) localStorage.removeItem(key);
  });
  await page.reload();
  await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
    "data-defined",
    "true",
  );
  await expect(page.getByTestId("segment-slot-2")).toHaveAttribute(
    "data-defined",
    "false",
  );
});

test("unreadable saved routes are preserved rather than replaced", async ({
  page,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await page.goto("/health");
  await page.evaluate(() =>
    localStorage.setItem("sprint-scout.drawn-routes.v1", "{not json"),
  );
  await page.goto("/");
  await expect(page.locator("p[role=status]")).toHaveText(
    "Cannot read saved routes. Existing data is preserved.",
  );
  await drawSegment(page, "Fresh segment").catch(() => {});
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sprint-scout.drawn-routes.v1"),
    ),
  ).toBe("{not json");
});
