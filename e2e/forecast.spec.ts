import { aRoute, expect, manage, segmentTime, slider, test } from "./fixtures";

// Southerly 5 m/s on a northbound line: hour 1 has no wind, hour 2 is calm,
// hour 47 is an easterly with rain.
test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 5, direction: 180, gust: null };
  openMeteo.hours = {
    0: { code: 2 },
    1: { speed: null },
    2: { speed: 0 },
    47: { direction: 270, code: 61 },
  };
});

const seeded = { routes: [aRoute({ id: "straight", name: "Straight" })] };

test("a saved segment opens at the first hour with a tailwind estimate @smoke @a11y", async ({
  page,
  seed,
  openMeteo,
  aria,
}) => {
  await seed(seeded);
  await expect(page.getByTestId("wind-summary")).toContainText(
    "18.0 km/h towards north · Tailwind",
  );
  await expect(page.getByTestId("ride-cockpit")).toHaveAttribute(
    "data-tone",
    "gain",
  );
  await expect(page.getByTestId("ride-cockpit")).toContainText("40.0 km/h");
  await expect(page.locator(".dial-range")).toHaveCount(1);
  await expect(page.getByTestId("weather-icon")).toHaveAttribute(
    "data-kind",
    "sun-cloud",
  );
  await expect(segmentTime(page)).not.toHaveText("Unavailable");
  expect(openMeteo.calls.weather).toBe(1);
  await aria("cockpit-tailwind", page.getByTestId("ride-cockpit"));
});

test("the legacy /routes address redirects to the planner", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await page.goto("/routes");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("link", { name: "Back to demo planner" }),
  ).toHaveCount(0);
});

test("an hour without wind reads unavailable and the previous hour comes back", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await expect(
    page.getByRole("button", { name: "Previous hour" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next hour" }).click();
  await expect(slider(page)).toHaveValue("1");
  await expect(segmentTime(page)).toHaveText("Unavailable");
  await expect(page.getByTestId("wind-summary")).toContainText(
    "Wind unavailable",
  );
  await expect(page.getByTestId("cockpit-speed")).toHaveText("Unavailable");
  await expect(page.locator(".dial-needle")).toHaveCount(0);
  await expect(page.getByTestId("wind-map-overlay")).toHaveCount(0);
  await page.getByRole("button", { name: "Previous hour" }).click();
  await expect(slider(page)).toHaveValue("0");
});

test("a calm hour matches the still-air time", async ({ page, seed }) => {
  await seed(seeded);
  await slider(page).fill("2");
  await expect(segmentTime(page)).toHaveText(
    await page.getByTestId("segment-calm-time").innerText(),
  );
  await expect(page.getByTestId("segment-time-difference")).toContainText(
    "Same time",
  );
  await expect(page.getByTestId("wind-summary")).toContainText("Calm");
});

test("tomorrow, best hour and today drive the slider and the selected window", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  const tailwindTime = await segmentTime(page).innerText();
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  expect(Number(await slider(page).inputValue())).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Best hour", exact: true }).click();
  await expect(slider(page)).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: "Best hour", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Today", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("selected-window")).toHaveAttribute(
    "data-best",
    "true",
  );
  await expect(page.getByTestId("selected-window")).toContainText(tailwindTime);
});

test("the last hour shows rain and a crosswind and disables next", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  const tailwindTime = await segmentTime(page).innerText();
  await slider(page).fill("47");
  await expect(
    page.getByRole("button", { name: "Best hour", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("selected-window")).toHaveAttribute(
    "data-best",
    "false",
  );
  await expect(segmentTime(page)).not.toHaveText(tailwindTime);
  await expect(page.getByRole("button", { name: "Next hour" })).toBeDisabled();
  await expect(page.getByTestId("wind-summary")).toContainText("Hour 48 of 48");
  await expect(page.getByTestId("wind-day-tick")).toHaveCount(2);
  await expect(page.getByTestId("weather-icon")).toHaveAttribute(
    "data-kind",
    "rain",
  );
  await expect(page.getByTestId("wind-summary")).toContainText(
    "towards east · Mostly crosswind",
  );
  expect(openMeteo.calls.weather).toBe(1);
});

test("mph converts every readout without a new request", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  await slider(page).fill("47");
  const crosswindTime = await segmentTime(page).innerText();
  await page
    .getByRole("group", { name: "Speed units" })
    .getByRole("button", { name: "mph" })
    .click();
  await expect(page.getByTestId("wind-summary")).toContainText("11.2 mph");
  await expect(page.getByTestId("ride-cockpit")).toContainText("24.9 mph");
  await expect(page.getByTestId("cockpit-speed")).toContainText("mph");
  await expect(segmentTime(page)).toHaveText(crosswindTime);
  await expect(page.getByTestId("wind-map-overlay")).toContainText("11.2 mph");
  expect(openMeteo.calls.weather).toBe(1);
});

test("the map overlay shows the wind and particles can be switched off", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await expect(page.getByTestId("wind-map-overlay")).toContainText("18.0 km/h");
  const particles = page.getByTestId("wind-particle-field");
  await expect(particles).toHaveAttribute("data-flow-degrees", "0");
  await expect(particles).toHaveAttribute("data-speed-mps", "5.0");
  await expect(particles).toHaveAttribute("data-motion", "animated");
  await page
    .getByRole("button", { name: "Wind particles on", exact: true })
    .click();
  await expect(particles).toHaveCount(0);
  await expect(page.locator(".wind-direction-arrow")).toBeVisible();
  await page
    .getByRole("button", { name: "Wind particles off", exact: true })
    .click();
  await expect(particles).toHaveCount(1);
});

test("reduced motion keeps the particle field static @a11y", async ({
  page,
  seed,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(seeded);
  await expect(page.getByTestId("wind-particle-field")).toHaveAttribute(
    "data-motion",
    "static",
  );
});

test("the slider answers Home, arrow keys and a click on the timeline @keyboard", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await slider(page).fill("5");
  await slider(page).focus();
  await page.keyboard.press("Home");
  await expect(slider(page)).toHaveValue("0");
  await page.keyboard.press("ArrowRight");
  await expect(slider(page)).toHaveValue("1");
  await expect(page.getByTestId("cockpit-speed")).toHaveText("Unavailable");
  await page.keyboard.press("End");
  await expect(slider(page)).toHaveValue("47");
  const bounds = await slider(page).boundingBox();
  await slider(page).click({
    position: { x: bounds!.width * 0.75, y: bounds!.height / 2 },
  });
  expect(Number(await slider(page).inputValue())).toBeGreaterThan(30);
});

test("the hourly table selects an hour", async ({ page, seed }) => {
  await seed(seeded);
  const tailwindTime = await segmentTime(page).innerText();
  await slider(page).fill("47");
  await page.getByText("Hourly times", { exact: true }).click();
  await page.locator(".hourly-time-table tbody button").first().click();
  await expect(slider(page)).toHaveValue("0");
  await expect(segmentTime(page)).toHaveText(tailwindTime);
});

test("the timeline stays on screen on a phone @mobile-only @mobile", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await slider(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(slider(page)).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId("ride-cockpit")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
});

test("deleting the segment removes the timeline and the map overlay", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await expect(page.getByTestId("wind-map-overlay")).toHaveCount(1);
  await manage(page, "Delete segment");
  await expect(slider(page)).toHaveCount(0);
  await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
    "data-defined",
    "false",
  );
  await expect(page.getByTestId("wind-map-overlay")).toHaveCount(0);
});
