import { aRoute, expect, reverseAndSave, segmentTime, test } from "./fixtures";

const panel = (page: import("@playwright/test").Page) =>
  page.getByTestId("efforts-panel");
const fixture = (name: string) => `e2e/data/${name}.gpx`;

async function importGpx(page: import("@playwright/test").Page, name: string) {
  await panel(page).getByLabel("Import GPX ride").setInputFiles(fixture(name));
}

test(
  "a GPX ride adds one effort per traversal without leaving the browser",
  { tag: ["@smoke"] },
  async ({ page, seed, openMeteo }) => {
    await seed({ routes: [aRoute()] });
    await expect(segmentTime(page)).not.toHaveText("Unavailable");
    await importGpx(page, "northbound-two-laps");
    const rows = page.getByTestId("effort-row");
    await expect(rows).toHaveCount(2);
    await expect(panel(page).getByRole("status")).toContainText(
      "2 efforts added from northbound-two-laps.gpx",
    );
    await expect(panel(page).getByRole("heading")).toContainText("Best 1m 4");
    await expect(rows.first().getByTestId("effort-time")).toHaveText(
      /^1m 4\ds$/,
    );
    expect(openMeteo.calls).toEqual({ weather: 1, elevation: 0, archive: 0 });
  },
);

test("imported efforts persist across reload", async ({ page, seed }) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "northbound-two-laps");
  await expect(page.getByTestId("effort-row")).toHaveCount(2);
  await page.reload();
  await expect(page.getByTestId("effort-row")).toHaveCount(2);
});

test("importing the same ride twice does not duplicate efforts", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "northbound-two-laps");
  await expect(page.getByTestId("effort-row")).toHaveCount(2);
  await importGpx(page, "northbound-two-laps");
  await expect(panel(page).getByRole("status")).toContainText("already saved");
  await expect(page.getByTestId("effort-row")).toHaveCount(2);
});

test("a ride in the opposite direction matches nothing", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "northbound-reversed");
  await expect(panel(page).getByRole("status")).toContainText(
    "No traversal of this segment found in northbound-reversed.gpx",
  );
  await expect(page.getByTestId("effort-row")).toHaveCount(0);
});

test("a file without track points is rejected with a clear message", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "not-a-track");
  await expect(panel(page).getByRole("status")).toContainText(
    "GPX file contains no track points.",
  );
});

test("an effort can be removed", async ({ page, seed }) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "northbound-two-laps");
  await expect(page.getByTestId("effort-row")).toHaveCount(2);
  await page
    .getByTestId("effort-row")
    .first()
    .getByRole("button", { name: /Remove effort/ })
    .click();
  await expect(page.getByTestId("effort-row")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("effort-row")).toHaveCount(1);
});

test("a geometry edit discards efforts matched to the old line", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "northbound-two-laps");
  await expect(page.getByTestId("effort-row")).toHaveCount(2);
  await reverseAndSave(page);
  await expect(panel(page)).toBeVisible();
  await expect(page.getByTestId("effort-row")).toHaveCount(0);
});

test(
  "efforts panel is keyboard reachable and described",
  { tag: ["@a11y"] },
  async ({ page, seed, aria }) => {
    await seed({ routes: [aRoute()] });
    await importGpx(page, "northbound-two-laps");
    await expect(page.getByTestId("effort-row")).toHaveCount(2);
    await aria("efforts-panel-two-laps", panel(page));
  },
);

test("import stays disabled until the recording is confirmed as the rider's own", async ({
  page,
  seed,
}) => {
  await seed({ routes: [aRoute()] });
  await expect(panel(page).getByLabel("Import GPX ride")).toBeDisabled();
  await panel(page)
    .getByRole("checkbox", { name: /my own device recording/ })
    .check();
  await expect(panel(page).getByLabel("Import GPX ride")).toBeEnabled();
});

test("past wind loads only after consent and is saved with the effort", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "northbound-two-laps");
  await expect(page.getByTestId("effort-row")).toHaveCount(2);
  await expect(page.getByTestId("effort-wind").first()).toHaveText(
    "Not loaded",
  );
  const load = panel(page).getByRole("button", { name: "Load past wind" });
  await expect(load).toBeDisabled();
  expect(openMeteo.calls.archive).toBe(0);
  await panel(page)
    .getByRole("checkbox", { name: /past wind/ })
    .check();
  await load.click();
  await expect(panel(page).getByRole("status")).toContainText(
    "Past wind saved for 2 efforts",
  );
  await expect(page.getByTestId("effort-wind").first()).toContainText(
    "Tailwind",
  );
  await expect(page.getByTestId("effort-wind").first()).toContainText(
    "18.0 km/h",
  );
  await expect(page.getByTestId("effort-wind").first()).toContainText(
    "model −",
  );
  expect(openMeteo.calls.archive).toBe(1);
  await expect(load).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId("effort-wind").first()).toContainText(
    "Tailwind",
  );
  expect(openMeteo.calls.archive).toBe(1);
});

test("an archive outage leaves efforts without wind and says so", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: [aRoute()] });
  await importGpx(page, "northbound-two-laps");
  openMeteo.faults.archive = "outage";
  await panel(page)
    .getByRole("checkbox", { name: /past wind/ })
    .check();
  await panel(page).getByRole("button", { name: "Load past wind" }).click();
  await expect(panel(page).getByRole("status")).toContainText(
    "Weather archive unavailable",
  );
  await expect(page.getByTestId("effort-wind").first()).toHaveText(
    "Not loaded",
  );
});
