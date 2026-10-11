import {
  aRoute,
  expect,
  segmentTime,
  slider,
  terrainPanel,
  test,
} from "./fixtures";

// Keyboard-only journeys: focus lands with focus() (WebKit's Tab skips buttons),
// text moves with Tab, and every action is a key press.
const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

test("a segment can be drawn and saved without a pointer @keyboard", async ({
  page,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await page.goto("/");
  await page.getByText("Enter coordinates instead", { exact: true }).focus();
  await page.keyboard.press("Enter");
  const latitude = page.getByLabel("Latitude", { exact: true });
  const longitude = page.getByLabel("Longitude", { exact: true });
  const add = page.getByRole("button", { name: "Add point and centre map" });
  for (const [lng, lat] of [
    ["-0.12", "51.5"],
    ["-0.12", "51.51"],
  ]) {
    await latitude.focus();
    await latitude.fill(lat);
    await page.keyboard.press("Tab");
    await expect(longitude).toBeFocused();
    await longitude.fill(lng);
    await add.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByText("2 / 500 points")).toBeVisible();
  const name = page.getByLabel("Route name", { exact: true });
  await name.focus();
  await name.fill("Keyboard ride");
  await page.getByRole("checkbox", { name: /created this route/ }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Save route", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("p[role=status]")).toHaveText(
    "Route saved on this browser.",
  );
});

test("the forecast hour changes with arrow keys and the readouts follow @keyboard", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.hours = { 1: { speed: 0 } };
  await seed(seeded);
  await slider(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider(page)).toHaveValue("1");
  await expect(page.getByTestId("wind-summary")).toContainText("Calm");
  await page.keyboard.press("ArrowLeft");
  await expect(slider(page)).toHaveValue("0");
  await expect(page.getByTestId("wind-summary")).not.toContainText("Calm");
});

test("day and best-hour buttons work from the keyboard @keyboard", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await page.getByRole("button", { name: "Tomorrow", exact: true }).focus();
  await page.keyboard.press("Enter");
  expect(Number(await slider(page).inputValue())).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Best hour", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Best hour", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("selected-window")).toHaveAttribute(
    "data-best",
    "true",
  );
});

test("terrain loads from the keyboard: consent with Space, load with Enter @keyboard", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  const panel = terrainPanel(page);
  await panel.getByRole("checkbox", { name: /Share sampled/ }).focus();
  await page.keyboard.press("Space");
  const load = panel.getByRole("button", { name: "Load terrain", exact: true });
  await expect(load).toBeEnabled();
  await load.focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("heading")).toHaveText("Terrain · Enabled");
  expect(openMeteo.calls.elevation).toBe(1);
  await expect(segmentTime(page)).not.toHaveText("Unavailable");
});

test("the hourly times table is reachable and scrollable by keyboard @keyboard @a11y", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await page.getByText("Hourly times", { exact: true }).focus();
  await page.keyboard.press("Enter");
  const table = page.getByRole("region", { name: "Hourly times table" });
  await table.focus();
  await expect(table).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.locator(".hourly-time-table tbody button").first().focus();
  await page.keyboard.press("Enter");
  await expect(slider(page)).toHaveValue("0");
});
