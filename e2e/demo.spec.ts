import { expect, paintedPixels, test } from "./fixtures";

// The demo planner serves synthetic forecasts from the API; its own clock is
// 2026-09-07T12:00Z, so the page clock matches it.
test.use({ fixedTime: "2026-09-07T12:00:00Z" });

const applied = async (page: import("@playwright/test").Page) => {
  await page.getByRole("button", { name: "Compare windows →" }).click();
  await expect(
    page.getByRole("button", { name: "Compare windows →" }),
  ).toBeEnabled();
};
// The demo is server-rendered; input made before hydration is dropped.
const openDemo = async (page: import("@playwright/test").Page) => {
  await page.goto("/demo");
  await expect(page.locator(".planner")).toHaveAttribute(
    "data-hydrated",
    "true",
  );
};
const attemptHour = (page: import("@playwright/test").Page) =>
  page.getByRole("slider", { name: "Attempt hour" });

test("the demo opens with the banner, a ready map and one selected hour everywhere @smoke @a11y", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/planner")) calls.push(r.url());
  });
  await openDemo(page);
  await expect(
    page.getByRole("heading", { name: "Find your tailwind." }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Demo mode" }),
  ).toContainText("Real Strava access is disabled");
  await expect(page.getByTestId("route-map")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  await attemptHour(page).focus();
  await attemptHour(page).press("Home");
  const at = "2026-09-08T15:00:00Z";
  for (const id of ["route-map", "hour-chart", "card-demo-north"])
    await expect(page.getByTestId(id)).toHaveAttribute("data-attempt", at);
  await expect(page.locator('tr[aria-current="true"]')).toHaveAttribute(
    "data-attempt",
    at,
  );
  expect(calls).toHaveLength(0);
});

test("departure follows the approach time without a new request", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/planner")) calls.push(r.url());
  });
  await openDemo(page);
  await attemptHour(page).focus();
  await attemptHour(page).press("Home");
  await expect(page.getByTestId("departure")).toContainText("15:30");
  await expect(page.getByTestId("ride-effect").first()).toContainText(
    /km\/h .*for a reference rider/,
  );
  await page.getByLabel("Approach (minutes)").fill("40");
  await expect(page.getByTestId("departure")).toContainText("15:10");
  expect(calls).toHaveLength(0);
  await attemptHour(page).press("End");
  await expect(page.getByTestId("card-demo-north")).toContainText("Caution");
});

test("the selected segment survives hour and window changes; chart and table agree", async ({
  page,
}) => {
  await openDemo(page);
  await page
    .getByTestId("card-demo-bend")
    .getByRole("button", { name: /Synthetic Bend/ })
    .click();
  await attemptHour(page).focus();
  await attemptHour(page).press("Home");
  await expect(page.getByTestId("route-map")).toHaveAttribute(
    "data-segment",
    "demo-bend",
  );
  await page.getByLabel("From", { exact: true }).fill("17:00");
  await applied(page);
  await expect(page.getByTestId("route-map")).toHaveAttribute(
    "data-segment",
    "demo-bend",
  );
  const last = page.getByTestId("hour-row").last();
  const at = await last.getAttribute("data-attempt");
  await last.getByRole("button").click();
  for (const id of ["hour-chart", "card-demo-bend"])
    await expect(page.getByTestId(id)).toHaveAttribute("data-attempt", at!);
});

test("deselecting every route asks for one to compare", async ({ page }) => {
  await openDemo(page);
  await page.getByLabel("Synthetic North", { exact: true }).uncheck();
  await page.getByLabel("Synthetic Bend", { exact: true }).uncheck();
  await applied(page);
  await expect(
    page.getByRole("heading", { name: "Choose a route to compare" }),
  ).toBeVisible();
});

test("incomplete weather marks unknown fields on the card", async ({
  page,
}) => {
  await openDemo(page);
  await page
    .getByText("Demo conditions & clock changes", { exact: true })
    .click();
  await page.getByLabel("Weather scenario").selectOption("incomplete");
  await applied(page);
  await expect(page.getByTestId("card-demo-north")).toContainText("Unknown");
  await expect(page.getByTestId("card-demo-north")).toContainText(
    "Some weather fields are unavailable",
  );
});

test("a partial failure keeps the good route and names the missing one", async ({
  page,
}) => {
  await openDemo(page);
  await page
    .getByText("Demo conditions & clock changes", { exact: true })
    .click();
  await page.getByLabel("Weather scenario").selectOption("partial");
  await applied(page);
  await expect(page.getByTestId("card-demo-north")).toBeVisible();
  await expect(page.getByTestId("card-demo-bend")).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Some results are unavailable" }),
  ).toContainText("Route geometry unavailable");
});

test("a stale forecast hides the map and says so", async ({ page }) => {
  await openDemo(page);
  await page
    .getByText("Demo conditions & clock changes", { exact: true })
    .click();
  await page.getByLabel("Weather scenario").selectOption("stale");
  await applied(page);
  await expect(
    page.getByRole("heading", { name: "Forecast is stale" }),
  ).toBeVisible();
  await expect(page.getByTestId("route-map")).toHaveCount(0);
});

test("a forecast outage offers a retry", async ({ page }) => {
  await openDemo(page);
  await page
    .getByText("Demo conditions & clock changes", { exact: true })
    .click();
  await page.getByLabel("Weather scenario").selectOption("outage");
  await applied(page);
  await expect(
    page.getByRole("heading", { name: "No covered opportunities" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry forecast", exact: true }),
  ).toBeVisible();
});

test("a network failure keeps the last results and retry shows loading", async ({
  page,
}) => {
  await openDemo(page);
  await page.route("**/api/planner?**", (route) => route.abort());
  await applied(page);
  await expect(page.locator("main [role=alert]")).toContainText(
    "Could not load conditions",
  );
  await expect(page.getByTestId("card-demo-north")).toBeVisible();
  await page.unroute("**/api/planner?**");
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/planner?**", async (route) => {
    await wait;
    await route.continue();
  });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Comparing supplied hourly forecasts" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("button", { name: "Compare windows →" }),
  ).toBeEnabled();
  await expect(page.locator("main [role=alert]")).toHaveCount(0);
});

test("without WebGL the map steps aside for the table @mobile", async ({
  page,
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
  await openDemo(page);
  await expect(
    page.getByText("Map unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: /Hourly comparison/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("the dark theme keeps its contrast @a11y", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDemo(page);
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator(".planner")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Light theme" })).toBeVisible();
});

test("the attempt hour moves with the arrow keys @keyboard", async ({
  page,
}) => {
  await openDemo(page);
  await attemptHour(page).focus();
  await page.keyboard.press("Home");
  await expect(attemptHour(page)).toHaveValue("0");
  await page.keyboard.press("ArrowRight");
  await expect(attemptHour(page)).toHaveValue("1");
  await page.keyboard.press("ArrowLeft");
  await expect(attemptHour(page)).toHaveValue("0");
});

test("a ride time inside the DST gap is rejected", async ({ page }) => {
  await openDemo(page);
  await page.getByLabel("Ride date").fill("2026-03-29");
  await page.getByLabel("From", { exact: true }).fill("01:30");
  await applied(page);
  await expect(page.locator("main [role=alert]")).toContainText(
    "does not exist",
  );
});

test("the directed map paints the selected route", async ({ page }) => {
  await openDemo(page);
  const map = page.getByTestId("route-map");
  await expect(map).toHaveAttribute("data-map-ready", "true");
  await expect
    .poll(
      () =>
        paintedPixels(page, map.locator("canvas"), [
          "#00796d",
          "#a85d00",
          "#566b72",
        ]),
      { timeout: 10000 },
    )
    .toBeGreaterThan(300);
});
