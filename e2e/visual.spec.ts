import { aRoute, expect, test } from "./fixtures";

// Baselines live in e2e/__screenshots__/<project>/ and are generated only inside
// the Playwright container (`pnpm test:visual:update`), so every platform
// compares against the same Linux rendering.
const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };
const options = { animations: "disabled" as const, maxDiffPixelRatio: 0.01 };

test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 5, direction: 180, gust: 8 };
  openMeteo.hours = { 2: { speed: 0 }, 6: { code: 61, isDay: 0 } };
});

test("cockpit dial and compass at a tailwind hour @visual", async ({ planner, seed }) => {
  await seed(seeded);

  await expect(planner.cockpit.region).toHaveAttribute("data-tone", "gain");
  await expect(planner.cockpit.dial).toHaveScreenshot("dial-tailwind.png", options);
  await expect(planner.cockpit.compass).toHaveScreenshot("compass-southerly.png", options);
});

test("cockpit dial at a calm hour @visual", async ({ planner, seed }) => {
  await seed(seeded);

  await planner.timeline.goToHour(2);

  await expect(planner.cockpit.windSummary).toContainText("Calm");
  await expect(planner.cockpit.dial).toHaveScreenshot("dial-calm.png", options);
});

test("timeline with night and rain bands @visual", async ({ planner, seed }) => {
  await seed(seeded);

  await expect(planner.timeline.wetBands).toHaveCount(1);
  await expect(planner.timeline.chart).toHaveScreenshot("timeline-bands.png", options);
});
