import { aRoute, expect, test } from "./fixtures";

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
  planner,
  seed,
  openMeteo,
  aria,
}) => {
  await seed(seeded);

  const { cockpit } = planner;
  await expect(cockpit.windSummary).toContainText(
    "18.0 km/h towards north · Tailwind",
  );
  await expect(cockpit.region).toHaveAttribute("data-tone", "gain");
  await expect(cockpit.region).toContainText("40.0 km/h");
  await expect(cockpit.dialRange).toHaveCount(1);
  await expect(cockpit.weatherIcon).toHaveAttribute("data-kind", "sun-cloud");
  await expect(cockpit.segmentTime).not.toHaveText("Unavailable");
  expect(openMeteo.calls.weather).toBe(1);
  await aria("cockpit-tailwind", cockpit.region);
});

test("the legacy /routes address redirects to the planner", async ({
  page,
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.openLegacyAddress();

  await expect(page).toHaveURL(/\/$/);
  await expect(planner.library.slot(1)).toHaveAttribute("aria-pressed", "true");
  await expect(planner.demoLink).toHaveCount(0);
});

test("previous hour is disabled at the first hour", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await expect(planner.timeline.previousButton).toBeDisabled();
});

test("an hour without wind reads unavailable", async ({ planner, seed }) => {
  await seed(seeded);

  await planner.timeline.next();

  const { cockpit } = planner;
  await expect(planner.timeline.slider).toHaveValue("1");
  await expect(cockpit.segmentTime).toHaveText("Unavailable");
  await expect(cockpit.windSummary).toContainText("Wind unavailable");
  await expect(cockpit.speed).toHaveText("Unavailable");
  await expect(cockpit.dialNeedle).toHaveCount(0);
  await expect(planner.map.overlay).toHaveCount(0);
});

test("previous hour steps back", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.timeline.next();

  await planner.timeline.previous();

  await expect(planner.timeline.slider).toHaveValue("0");
});

test("a calm hour matches the still-air time", async ({ planner, seed }) => {
  await seed(seeded);

  await planner.timeline.goToHour(2);

  const { cockpit } = planner;
  await expect(cockpit.segmentTime).toHaveText(
    await cockpit.calmTime.innerText(),
  );
  await expect(cockpit.timeDifference).toContainText("Same time");
  await expect(cockpit.windSummary).toContainText("Calm");
});

test("tomorrow moves the slider past today", async ({ planner, seed }) => {
  await seed(seeded);

  await planner.timeline.tomorrow();

  expect(await planner.timeline.hour()).toBeGreaterThan(0);
});

test("best hour selects the best window today", async ({ planner, seed }) => {
  await seed(seeded);
  const tailwindTime = await planner.cockpit.time();
  await planner.timeline.tomorrow();

  await planner.timeline.bestHour();

  const { timeline } = planner;
  await expect(timeline.slider).toHaveValue("0");
  await expect(timeline.bestHourButton).toHaveAttribute("aria-pressed", "true");
  await expect(timeline.todayButton).toHaveAttribute("aria-pressed", "true");
  await expect(timeline.selectedWindow).toHaveAttribute("data-best", "true");
  await expect(timeline.selectedWindow).toContainText(tailwindTime);
});

test("the last hour shows rain and a crosswind and disables next", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  const tailwindTime = await planner.cockpit.time();

  await planner.timeline.goToHour(47);

  const { timeline, cockpit } = planner;
  await expect(timeline.bestHourButton).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(timeline.selectedWindow).toHaveAttribute("data-best", "false");
  await expect(cockpit.segmentTime).not.toHaveText(tailwindTime);
  await expect(timeline.nextButton).toBeDisabled();
  await expect(cockpit.windSummary).toContainText("Hour 48 of 48");
  await expect(timeline.dayTicks).toHaveCount(2);
  await expect(cockpit.weatherIcon).toHaveAttribute("data-kind", "rain");
  await expect(cockpit.windSummary).toContainText(
    "towards east · Mostly crosswind",
  );
  expect(openMeteo.calls.weather).toBe(1);
});

test("mph converts every readout without a new request", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  await planner.timeline.goToHour(47);
  const crosswindTime = await planner.cockpit.time();

  await planner.useMph();

  const { cockpit } = planner;
  await expect(cockpit.windSummary).toContainText("11.2 mph");
  await expect(cockpit.region).toContainText("24.9 mph");
  await expect(cockpit.speed).toContainText("mph");
  await expect(cockpit.segmentTime).toHaveText(crosswindTime);
  await expect(planner.map.overlay).toContainText("11.2 mph");
  expect(openMeteo.calls.weather).toBe(1);
});

test("the map overlay shows the wind with animated particles", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  const { map } = planner;
  await expect(map.overlay).toContainText("18.0 km/h");
  await expect(map.particles).toHaveAttribute("data-flow-degrees", "0");
  await expect(map.particles).toHaveAttribute("data-speed-mps", "5.0");
  await expect(map.particles).toHaveAttribute("data-motion", "animated");
});

test("switching particles off leaves the wind arrow", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.map.hideParticles();

  await expect(planner.map.particles).toHaveCount(0);
  await expect(planner.map.arrow).toBeVisible();
});

test("switching particles back on restores the field", async ({
  planner,
  seed,
}) => {
  await seed(seeded);
  await planner.map.hideParticles();

  await planner.map.showParticles();

  await expect(planner.map.particles).toHaveCount(1);
});

test("reduced motion keeps the particle field static @a11y", async ({
  page,
  planner,
  seed,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await seed(seeded);

  await expect(planner.map.particles).toHaveAttribute("data-motion", "static");
});

test("Home moves the slider to the first hour @keyboard", async ({
  planner,
  seed,
}) => {
  await seed(seeded);
  await planner.timeline.goToHour(5);

  await planner.timeline.press("Home");

  await expect(planner.timeline.slider).toHaveValue("0");
});

test("ArrowRight steps one hour and the readouts follow @keyboard", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.timeline.press("ArrowRight");

  await expect(planner.timeline.slider).toHaveValue("1");
  await expect(planner.cockpit.speed).toHaveText("Unavailable");
});

test("End moves the slider to the last hour @keyboard", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.timeline.press("End");

  await expect(planner.timeline.slider).toHaveValue("47");
});

test("a click on the timeline jumps to that hour @keyboard", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.timeline.clickTrack(0.75);

  expect(await planner.timeline.hour()).toBeGreaterThan(30);
});

test("the hourly table selects an hour", async ({ planner, seed }) => {
  await seed(seeded);
  const tailwindTime = await planner.cockpit.time();
  await planner.timeline.goToHour(47);

  await planner.timeline.showHourlyTimes();
  await planner.timeline.pickHourlyRow(0);

  await expect(planner.timeline.slider).toHaveValue("0");
  await expect(planner.cockpit.segmentTime).toHaveText(tailwindTime);
});

test("the timeline stays on screen on a phone @mobile-only @mobile", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.timeline.centre();

  await expect(planner.timeline.slider).toBeInViewport({ ratio: 1 });
  await expect(planner.cockpit.region).toBeInViewport();
  expect(await planner.horizontalOverflow()).toBe(0);
});

test("deleting the segment removes the timeline and the map overlay", async ({
  planner,
  seed,
}) => {
  await seed(seeded);
  await expect(planner.map.overlay).toHaveCount(1);

  await planner.library.delete();

  await expect(planner.timeline.slider).toHaveCount(0);
  await expect(planner.library.slot(1)).toHaveAttribute(
    "data-defined",
    "false",
  );
  await expect(planner.map.overlay).toHaveCount(0);
});
