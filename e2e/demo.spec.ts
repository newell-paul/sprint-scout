import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// The demo planner serves synthetic forecasts from the API; its own clock is
// 2026-09-07T12:00Z, so the page clock matches it.
test.use({ fixedTime: "2026-09-07T12:00:00Z" });

const plannerCalls = (page: Page) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/planner")) calls.push(request.url());
  });
  return calls;
};

test("the demo opens with the banner and a ready map @smoke @a11y", async ({
  demo,
}) => {
  await demo.open();

  await expect(demo.heading).toBeVisible();
  await expect(demo.banner).toContainText("Real Strava access is disabled");
  await expect(demo.map).toHaveAttribute("data-map-ready", "true");
});

test("one selected hour shows everywhere without a new request @smoke", async ({
  page,
  demo,
}) => {
  const calls = plannerCalls(page);
  await demo.open();

  await demo.pressAttemptHour("Home");

  const at = "2026-09-08T15:00:00Z";
  await expect(demo.map).toHaveAttribute("data-attempt", at);
  await expect(demo.chart).toHaveAttribute("data-attempt", at);
  await expect(demo.card("demo-north")).toHaveAttribute("data-attempt", at);
  await expect(demo.currentRow).toHaveAttribute("data-attempt", at);
  expect(calls).toHaveLength(0);
});

test("departure follows the approach time without a new request", async ({
  page,
  demo,
}) => {
  const calls = plannerCalls(page);
  await demo.open();
  await demo.pressAttemptHour("Home");
  await expect(demo.departure).toContainText("15:30");
  await expect(demo.rideEffects.first()).toContainText(
    /km\/h .*for a reference rider/,
  );

  await demo.setApproach(40);

  await expect(demo.departure).toContainText("15:10");
  expect(calls).toHaveLength(0);
});

test("the last attempt hour warns on the north card", async ({ demo }) => {
  await demo.open();

  await demo.pressAttemptHour("End");

  await expect(demo.card("demo-north")).toContainText("Caution");
});

test("the selected segment survives hour and window changes", async ({
  demo,
}) => {
  await demo.open();
  await demo.selectSegment(/Synthetic Bend/, "demo-bend");
  await demo.pressAttemptHour("Home");
  await expect(demo.map).toHaveAttribute("data-segment", "demo-bend");

  await demo.setFrom("17:00");
  await demo.compare();

  await expect(demo.map).toHaveAttribute("data-segment", "demo-bend");
});

test("a row picked in the table moves the chart and the card", async ({
  demo,
}) => {
  await demo.open();
  await demo.selectSegment(/Synthetic Bend/, "demo-bend");

  const at = await demo.pickLastHour();

  await expect(demo.chart).toHaveAttribute("data-attempt", at);
  await expect(demo.card("demo-bend")).toHaveAttribute("data-attempt", at);
});

test("deselecting every route asks for one to compare", async ({ demo }) => {
  await demo.open();

  await demo.deselectRoute("Synthetic North");
  await demo.deselectRoute("Synthetic Bend");
  await demo.compare();

  await expect(demo.messageHeading("Choose a route to compare")).toBeVisible();
});

test("incomplete weather marks unknown fields on the card", async ({
  demo,
}) => {
  await demo.open();

  await demo.chooseScenario("incomplete");
  await demo.compare();

  await expect(demo.card("demo-north")).toContainText("Unknown");
  await expect(demo.card("demo-north")).toContainText(
    "Some weather fields are unavailable",
  );
});

test("a partial failure keeps the good route and names the missing one", async ({
  demo,
}) => {
  await demo.open();

  await demo.chooseScenario("partial");
  await demo.compare();

  await expect(demo.card("demo-north")).toBeVisible();
  await expect(demo.card("demo-bend")).toHaveCount(0);
  await expect(demo.status("Some results are unavailable")).toContainText(
    "Route geometry unavailable",
  );
});

test("a stale forecast hides the map and says so", async ({ demo }) => {
  await demo.open();

  await demo.chooseScenario("stale");
  await demo.compare();

  await expect(demo.messageHeading("Forecast is stale")).toBeVisible();
  await expect(demo.map).toHaveCount(0);
});

test("a forecast outage offers a retry", async ({ demo }) => {
  await demo.open();

  await demo.chooseScenario("outage");
  await demo.compare();

  await expect(demo.messageHeading("No covered opportunities")).toBeVisible();
  await expect(demo.retryForecastButton).toBeVisible();
});

test("a network failure keeps the last results", async ({ page, demo }) => {
  await demo.open();
  await page.route("**/api/planner?**", (route) => route.abort());

  await demo.compare();

  await expect(demo.alert).toContainText("Could not load conditions");
  await expect(demo.card("demo-north")).toBeVisible();
});

test("retry after a network failure shows loading, then clears the error", async ({
  page,
  demo,
}) => {
  await demo.open();
  await page.route("**/api/planner?**", (route) => route.abort());
  await demo.compare();
  await expect(demo.alert).toBeVisible();
  await page.unroute("**/api/planner?**");
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/planner?**", async (route) => {
    await wait;
    await route.continue();
  });

  await demo.retry();

  await expect(
    demo.status("Comparing supplied hourly forecasts"),
  ).toBeVisible();

  release();

  await expect(demo.compareButton).toBeEnabled();
  await expect(demo.alert).toHaveCount(0);
});

test("without WebGL the map steps aside for the table @mobile", async ({
  page,
  demo,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof original;
  });

  await demo.open();

  await expect(demo.mapUnavailable).toBeVisible();
  await expect(demo.table).toBeVisible();
  expect(await demo.horizontalOverflow()).toBeLessThanOrEqual(0);
});

test("the dark theme keeps its contrast @a11y", async ({ page, demo }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await demo.open();

  await demo.useDarkTheme();

  await expect(demo.root).toHaveAttribute("data-theme", "dark");
  await expect(demo.lightThemeButton).toBeVisible();
});

test("ArrowRight moves the attempt hour forward @keyboard", async ({
  demo,
}) => {
  await demo.open();
  await demo.pressAttemptHour("Home");

  await demo.pressAttemptHour("ArrowRight");

  await expect(demo.attemptHour).toHaveValue("1");
});

test("ArrowLeft moves the attempt hour back @keyboard", async ({ demo }) => {
  await demo.open();
  await demo.pressAttemptHour("Home");
  await demo.pressAttemptHour("ArrowRight");

  await demo.pressAttemptHour("ArrowLeft");

  await expect(demo.attemptHour).toHaveValue("0");
});

test("a ride time inside the DST gap is rejected", async ({ demo }) => {
  await demo.open();

  await demo.setRideDate("2026-03-29");
  await demo.setFrom("01:30");
  await demo.compare();

  await expect(demo.alert).toContainText("does not exist");
});

test("the directed map paints the selected route", async ({ demo }) => {
  await demo.open();

  await expect(demo.map).toHaveAttribute("data-map-ready", "true");
  await expect
    .poll(() => demo.painted(["#00796d", "#a85d00", "#566b72"]), {
      timeout: 10000,
    })
    .toBeGreaterThan(300);
});
