import { aRoute, expect, test } from "./fixtures";

// Steady southerly with gusts; hour 0 is stronger, hour 3 has no data.
test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 4, direction: 180, gust: 10 };
  openMeteo.hours = {
    0: { speed: 8 },
    3: { speed: null, gust: null, precipitation: null, probability: null },
  };
});

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };
const withTarget = { routes: [aRoute({ id: "north", targetTimeS: 90 })] };

test("a saved target compares with the estimate without a new request", async ({ planner, seed, openMeteo }) => {
  await seed(seeded);

  await planner.attempt.setTarget("1:30");

  await expect(planner.attempt.comparison).toContainText("Target 1m 30s");
  expect(openMeteo.calls.weather).toBe(1);
});

test("a saved target persists across reload", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.attempt.setTarget("1:30");
  await expect(planner.attempt.comparison).toContainText("Target 1m 30s");

  await planner.reload();

  await expect(planner.attempt.comparison).toContainText("Target 1m 30s");
});

test("removing the target clears the comparison", async ({ planner, seed }) => {
  await seed(withTarget);
  await expect(planner.attempt.comparison).toHaveCount(1);

  await planner.attempt.removeTarget();

  await expect(planner.attempt.comparison).toHaveCount(0);
});

test("a removed target stays removed after reload", async ({ planner, seed }) => {
  await seed(withTarget);
  await planner.attempt.removeTarget();
  await expect(planner.attempt.comparison).toHaveCount(0);

  await planner.reload();

  await expect(planner.attempt.comparison).toHaveCount(0);
});

test("conditions and target stay compact on a phone @mobile-only @mobile", async ({ planner, seed }) => {
  await seed(withTarget);

  await expect(planner.attempt.comparison).toBeVisible();
  expect(await planner.horizontalOverflow()).toBe(0);
});
