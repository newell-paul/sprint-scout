import { aRoute, expect, test } from "./fixtures";

// Southerly all day; hours 0–5 are night, hour 6 rains.
test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 4, direction: 180, gust: null };
  openMeteo.hours = Object.fromEntries(
    Array.from({ length: 48 }, (_, i) => [
      i,
      i === 6 ? { speed: 8, code: 61 } : i < 6 ? { speed: 7, code: 1, isDay: 0 as const } : { code: 1 },
    ]),
  );
});

test.use({ fixedTime: "2026-09-10T07:00:00Z" });
const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

test("dry daylight only moves the best hour past the rain", async ({ planner, seed }) => {
  await seed(seeded);

  await planner.timeline.onlyDryDaylight();
  await planner.timeline.bestHour();

  await expect(planner.timeline.slider).toHaveValue("7");
});

test("rider power changes the still-air time", async ({ planner, seed }) => {
  await seed(seeded);
  await expect(planner.rider.summary).toContainText("Reference rider · 40.0 km/h");
  const calmBefore = await planner.cockpit.calmTime.innerText();
  await planner.rider.open();

  await planner.rider.setPower(400);

  await expect(planner.rider.summary).toContainText("Your numbers");
  await expect(planner.cockpit.calmTime).not.toHaveText(calmBefore);
});

test("the rider's numbers persist across reload", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.rider.open();
  await planner.rider.setPower(400);
  await expect(planner.rider.summary).toContainText("Your numbers");

  await planner.reload();

  await expect(planner.rider.summary).toContainText("Your numbers");
});
