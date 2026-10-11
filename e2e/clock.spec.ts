import { aRoute, expect, slider, test } from "./fixtures";

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

test.describe("forecast expiry", () => {
  test.use({ installClock: true });

  test("the forecast refreshes itself once its 30-minute window passes", async ({
    page,
    seed,
    openMeteo,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seed(seeded);
    await expect(slider(page)).toBeVisible();
    expect(openMeteo.calls.weather).toBe(1);
    await slider(page).fill("5");
    await page.clock.fastForward(29 * 60_000);
    expect(openMeteo.calls.weather).toBe(1);
    await page.clock.fastForward(2 * 60_000);
    await expect.poll(() => openMeteo.calls.weather).toBe(2);
    await expect(slider(page)).toHaveValue("5");
  });
});
