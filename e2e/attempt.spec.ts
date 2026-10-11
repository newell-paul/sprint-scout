import { aRoute, expect, segmentTime, slider, test } from "./fixtures";

// Steady southerly with gusts; hour 0 is stronger, hour 3 has no data.
test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 4, direction: 180, gust: 10 };
  openMeteo.hours = {
    0: { speed: 8 },
    3: { speed: null, gust: null, precipitation: null, probability: null },
  };
});

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };
const conditions = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Attempt conditions" });
const targetField = (page: import("@playwright/test").Page) =>
  page.getByLabel("Target time (minutes:seconds)");

test("conditions show sustained wind, gusts and precipitation for the hour", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await expect(segmentTime(page)).not.toHaveText("Unavailable");
  await expect(conditions(page)).toContainText("36.0 km/h");
  await expect(conditions(page)).toContainText("0.0 mm · 20% chance");
});

test("an hour without data reads unavailable in conditions and the target comparison", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute({ id: "north", targetTimeS: 90 })] });
  await slider(page).fill("3");
  await expect(conditions(page)).toContainText("Unavailable");
  await expect(page.getByTestId("target-comparison")).toContainText(
    "comparison unavailable",
  );
});

test("a target outside minutes:seconds is refused", async ({ page, seed }) => {
  await seed(seeded);
  await targetField(page).fill("1:60");
  await page.getByRole("button", { name: "Save target", exact: true }).click();
  await expect(
    page.getByText("Enter minutes:seconds, from 0:01 to 1440:00.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("target-comparison")).toHaveCount(0);
});

test("a saved target compares with the estimate and persists across reload", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  await targetField(page).fill("1:30");
  await page.getByRole("button", { name: "Save target", exact: true }).click();
  await expect(page.getByTestId("target-comparison")).toContainText(
    "Target 1m 30s",
  );
  expect(openMeteo.calls.weather).toBe(1);
  await page.reload();
  await expect(page.getByTestId("target-comparison")).toContainText(
    "Target 1m 30s",
  );
});

test("removing the target clears the comparison and persists", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute({ id: "north", targetTimeS: 90 })] });
  await expect(page.getByTestId("target-comparison")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Remove target", exact: true })
    .click();
  await expect(page.getByTestId("target-comparison")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("target-comparison")).toHaveCount(0);
});

test("targets can be edited during a weather outage", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed(seeded);
  await targetField(page).fill("1:45");
  await page.getByRole("button", { name: "Save target", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Segment target · 1m 45s" }),
  ).toBeVisible();
});

test("mph converts the conditions", async ({ page, seed }) => {
  await seed(seeded);
  await page
    .getByRole("group", { name: "Speed units" })
    .getByRole("button", { name: "mph", exact: true })
    .click();
  await expect(conditions(page)).toContainText("22.4 mph");
});

test("conditions and target stay compact on a phone @mobile-only @mobile", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute({ id: "north", targetTimeS: 90 })] });
  await expect(page.getByTestId("target-comparison")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
});
