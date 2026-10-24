import { aRoute, expect, test } from "./fixtures";

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

test.describe("forecast expiry", () => {
  test.use({ installClock: true });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("the forecast is kept for its 30-minute window", async ({ page, planner, seed, openMeteo }) => {
    await seed(seeded);
    await expect(planner.timeline.slider).toBeVisible();

    await page.clock.fastForward(29 * 60_000);

    expect(openMeteo.calls.weather).toBe(1);
  });

  test("the forecast refreshes itself once its window passes and keeps the hour", async ({
    page,
    planner,
    seed,
    openMeteo,
  }) => {
    await seed(seeded);
    await planner.timeline.goToHour(5);

    await page.clock.fastForward(31 * 60_000);

    await expect.poll(() => openMeteo.calls.weather).toBe(2);
    await expect(planner.timeline.slider).toHaveValue("5");
  });
});
