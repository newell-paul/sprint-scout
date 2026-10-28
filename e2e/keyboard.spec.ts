import { aRoute, expect, northbound, test } from "./fixtures";

// Keyboard-only journeys: focus lands with focus() (WebKit's Tab skips buttons),
// text moves with Tab, and every action is a key press.
const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

test.describe("drawing", () => {
  test.beforeEach(async ({ planner, openMeteo }) => {
    openMeteo.faults.weather = "outage";
    await planner.open();
  });

  test("Tab moves from latitude to longitude @keyboard", async ({ planner }) => {
    await planner.editor.coordinatesToggle.press("Enter");

    await planner.editor.latitude.press("Tab");

    await expect(planner.editor.longitude).toBeFocused();
  });

  test("points can be added without a pointer @keyboard", async ({ planner }) => {
    await planner.editor.coordinatesToggle.press("Enter");

    for (const point of northbound) await planner.editor.addPointWithKeyboard(point);

    await expect(planner.editor.pointCount(2)).toBeVisible();
  });

  test("a segment can be saved without a pointer @keyboard", async ({ planner }) => {
    await planner.editor.coordinatesToggle.press("Enter");
    for (const point of northbound) await planner.editor.addPointWithKeyboard(point);

    await planner.editor.segmentName.focus();
    await planner.editor.segmentName.fill("Keyboard ride");
    await planner.editor.ownership.press("Space");
    await planner.editor.saveButton.press("Enter");

    await expect(planner.status).toHaveText("Segment saved on this browser.");
  });
});

test.describe("forecast", () => {
  test.beforeEach(({ openMeteo }) => {
    openMeteo.hours = { 1: { speed: 0 } };
  });

  test("ArrowRight moves to the next hour and the readouts follow @keyboard", async ({ planner, seed }) => {
    await seed(seeded);

    await planner.timeline.press("ArrowRight");

    await expect(planner.timeline.slider).toHaveValue("1");
    await expect(planner.cockpit.windSummary).toContainText("Calm");
  });

  test("ArrowLeft moves back and the readouts follow @keyboard", async ({ planner, seed }) => {
    await seed(seeded);
    await planner.timeline.press("ArrowRight");
    await expect(planner.cockpit.windSummary).toContainText("Calm");

    await planner.timeline.press("ArrowLeft");

    await expect(planner.timeline.slider).toHaveValue("0");
    await expect(planner.cockpit.windSummary).not.toContainText("Calm");
  });
});

test("Tomorrow works from the keyboard @keyboard", async ({ planner, seed }) => {
  await seed(seeded);

  await planner.timeline.tomorrowButton.press("Enter");

  expect(await planner.timeline.hour()).toBeGreaterThan(0);
});

test("Best hour works from the keyboard @keyboard", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.timeline.tomorrowButton.press("Enter");

  await planner.timeline.bestHourButton.press("Space");

  await expect(planner.timeline.bestHourButton).toHaveAttribute("aria-pressed", "true");
  await expect(planner.timeline.selectedWindow).toHaveAttribute("data-best", "true");
});

test("terrain loads from the keyboard: consent with Space, load with Enter @keyboard", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(seeded);

  await planner.terrain.consent.press("Space");
  await expect(planner.terrain.loadButton).toBeEnabled();
  await planner.terrain.loadButton.press("Enter");

  await expect(planner.terrain.heading).toHaveText("Terrain · Enabled");
  expect(openMeteo.calls.elevation).toBe(1);
  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
});

test("the hourly times table opens and takes focus from the keyboard @keyboard @a11y", async ({ planner, seed }) => {
  await seed(seeded);

  await planner.timeline.hourlyToggle.press("Enter");
  await planner.timeline.hourlyTable.focus();

  await expect(planner.timeline.hourlyTable).toBeFocused();
});

test("Enter on an hourly row selects that hour @keyboard @a11y", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.timeline.hourlyToggle.press("Enter");
  // Hour 0 is already selected, so only a later row proves Enter selects.
  await expect(planner.timeline.slider).toHaveValue("0");

  await planner.timeline.hourlyButtons.nth(5).press("Enter");

  await expect(planner.timeline.slider).toHaveValue("5");
});

// Untagged so only Chromium runs it: Playwright's WebKit does not scroll a
// focused region on ArrowDown.
test("arrow keys scroll the focused hourly times table", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.timeline.hourlyToggle.press("Enter");
  const before = await planner.timeline.hourlyScrollTop();

  await planner.timeline.hourlyTable.press("ArrowDown");

  await expect.poll(() => planner.timeline.hourlyScrollTop()).toBeGreaterThan(before);
});
