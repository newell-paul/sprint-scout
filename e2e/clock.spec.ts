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

test.describe("board expiry", () => {
  test.use({ installClock: true, fixedTime: "2026-09-10T07:00:00Z" });

  test("a board left open re-ranks every segment once its forecasts expire", async ({
    page,
    planner,
    seed,
    openMeteo,
  }) => {
    const southbound = aRoute({
      id: "south",
      name: "Southbound",
      slot: 1,
      points: [
        [-0.2, 51.51],
        [-0.2, 51.5],
      ],
    });
    await seed({ routes: [...seeded.routes, southbound] });
    await planner.board.rank();
    await expect(planner.board.rows).toHaveCount(2);
    const southCalls = () => openMeteo.weatherLongitudes.filter((lon) => lon === "-0.2").length;
    expect(southCalls()).toBe(1);

    await page.clock.fastForward(31 * 60_000);

    await expect.poll(southCalls).toBe(2);
    await expect(planner.board.row("Southbound")).toHaveAttribute("data-status", "ranked");
  });
});
