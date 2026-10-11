import { aRoute, expect, slider, test } from "./fixtures";

// Baselines live in e2e/__screenshots__/<project>/ and are generated only inside
// the Playwright container (`pnpm test:visual:update`), so every platform
// compares against the same Linux rendering.
const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };
const options = { animations: "disabled" as const, maxDiffPixelRatio: 0.01 };

test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 5, direction: 180, gust: 8 };
  openMeteo.hours = { 2: { speed: 0 }, 6: { code: 61, isDay: 0 } };
});

test("cockpit dial and compass at a tailwind hour @visual", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await expect(page.getByTestId("ride-cockpit")).toHaveAttribute(
    "data-tone",
    "gain",
  );
  await expect(page.locator(".speed-dial")).toHaveScreenshot(
    "dial-tailwind.png",
    options,
  );
  await expect(page.locator(".wind-compass")).toHaveScreenshot(
    "compass-southerly.png",
    options,
  );
});

test("cockpit dial at a calm hour @visual", async ({ page, seed }) => {
  await seed(seeded);
  await slider(page).fill("2");
  await expect(page.getByTestId("wind-summary")).toContainText("Calm");
  await expect(page.locator(".speed-dial")).toHaveScreenshot(
    "dial-calm.png",
    options,
  );
});

test("timeline with night and rain bands @visual", async ({ page, seed }) => {
  await seed(seeded);
  await expect(page.getByTestId("band-wet")).toHaveCount(1);
  await expect(page.getByTestId("time-chart")).toHaveScreenshot(
    "timeline-bands.png",
    options,
  );
});

test("demo planner in the light theme @visual", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByTestId("route-map")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  await expect(page.getByTestId("hour-chart")).toHaveScreenshot(
    "demo-hour-chart-light.png",
    options,
  );
});

test("demo planner in the dark theme @visual", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByTestId("route-map")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.getByTestId("hour-chart")).toHaveScreenshot(
    "demo-hour-chart-dark.png",
    options,
  );
});
