import {
  aRoute,
  drawSegment,
  paintedPixels,
  expect,
  manage,
  northbound,
  segmentHeading,
  test,
} from "./fixtures";

test("coordinates add points and reverse puts the finish first", async ({
  page,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await page.goto("/routes");
  await page.getByText("Enter coordinates instead", { exact: true }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("51.5");
  await page.getByLabel("Longitude", { exact: true }).fill("-0.12");
  await page.getByRole("button", { name: "Add point and centre map" }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("51.51");
  await page.getByRole("button", { name: "Add point and centre map" }).click();
  await expect(page.getByText("2 / 500 points")).toBeVisible();
  await page.getByRole("button", { name: "Reverse direction" }).click();
  await page.getByText("Ordered route points").click();
  await expect(page.locator(".segment-editor ol li").first()).toContainText(
    "51.51000, -0.12000 — start",
  );
});

test("an out-of-range coordinate is refused with the valid ranges", async ({
  page,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await page.goto("/");
  await page.getByText("Enter coordinates instead", { exact: true }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("91");
  await page.getByLabel("Longitude", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Add point and centre map" }).click();
  await expect(page.locator("p[role=status]")).toHaveText(
    "Enter longitude −180 to 180 and latitude −85 to 85.",
  );
  await expect(page.getByText("0 / 500 points")).toBeVisible();
});

test("save stays disabled until the independent-source box is ticked @a11y", async ({
  page,
  openMeteo,
  aria,
}) => {
  openMeteo.faults.weather = "outage";
  await page.goto("/");
  await page.getByText("Enter coordinates instead", { exact: true }).click();
  for (const [longitude, latitude] of northbound) {
    await page.getByLabel("Latitude", { exact: true }).fill(String(latitude));
    await page.getByLabel("Longitude", { exact: true }).fill(String(longitude));
    await page
      .getByRole("button", { name: "Add point and centre map" })
      .click();
  }
  await page.getByLabel("Route name", { exact: true }).fill("Independent ride");
  const save = page.getByRole("button", { name: "Save route", exact: true });
  await expect(save).toBeDisabled();
  await expect(save).toHaveAccessibleDescription(
    "Tick the independent-source confirmation above to enable Save route.",
  );
  await page.getByRole("checkbox", { name: /created this route/ }).check();
  await expect(save).toBeEnabled();
  await aria("drawing-ready-to-save", page.locator(".segment-editor"));
});

test("a saved route persists across reload and the next slot is empty @smoke", async ({
  page,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await page.goto("/");
  await drawSegment(page, "Independent ride");
  await page.reload();
  await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
    "data-defined",
    "true",
  );
  await expect(segmentHeading(page)).toContainText("Independent ride");
  await page.getByTestId("segment-slot-2").click();
  await expect(page.getByText("Segment 2 is empty")).toBeVisible();
});

test("redraw counts points, undo removes one and clear empties the draft", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ name: "Independent ride" })] });
  await manage(page, "Redraw segment");
  await expect(page.getByText("2 / 500 points")).toBeVisible();
  await page.getByRole("button", { name: "Undo point" }).click();
  await expect(page.getByText("1 / 500 points")).toBeVisible();
  await page.getByRole("button", { name: "Clear drawing" }).click();
  await expect(page.getByText("0 / 500 points")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
    "data-defined",
    "true",
  );
});

test("cancelling a redraw keeps the saved name and re-enables the slots", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ name: "Independent ride" })] });
  await manage(page, "Redraw segment");
  await page.getByLabel("Route name", { exact: true }).fill("Cancelled name");
  await expect(page.getByTestId("segment-slot-2")).toBeDisabled();
  await page.getByRole("button", { name: "Cancel drawing" }).click();
  await expect(segmentHeading(page)).toContainText("Independent ride");
  await expect(page.getByTestId("segment-slot-2")).toBeEnabled();
});

test("a redraw with a new name renames the segment and persists", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ name: "Independent ride" })] });
  await manage(page, "Redraw segment");
  await page.getByLabel("Route name", { exact: true }).fill("Updated ride");
  await page.getByRole("checkbox", { name: /created this route/ }).check();
  await page.getByRole("button", { name: "Save route", exact: true }).click();
  await page.reload();
  await expect(segmentHeading(page)).toContainText("Updated ride");
});

test("delete empties the slot and undo delete restores it after reload", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ name: "Updated ride" })] });
  await manage(page, "Delete segment");
  await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
    "data-defined",
    "false",
  );
  await page.getByRole("button", { name: "Undo delete" }).click();
  await page.reload();
  await expect(segmentHeading(page)).toContainText("Updated ride");
});

test("a saved segment is painted on the map @smoke", async ({ page }) => {
  await page.route(/tile\.openstreetmap\.org/, (route) => route.abort());
  await page.goto("/");
  await drawSegment(page, "Painted ride");
  const canvas = page
    .getByRole("region", { name: "Route drawing map" })
    .locator("canvas.maplibregl-canvas");
  await expect
    .poll(() => paintedPixels(page, canvas, "#ff5c4d"), { timeout: 10000 })
    .toBeGreaterThan(300);
});

test.describe("first visit", () => {
  test.use({ firstVisit: true });

  test("opens on the example segment, which stays deleted once removed @smoke", async ({
    page,
    openMeteo,
  }) => {
    openMeteo.faults.weather = "outage";
    await page.goto("/");
    await expect(segmentHeading(page)).toContainText("Richmond Park (example)");
    await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
      "data-defined",
      "true",
    );
    await page.reload();
    await expect(segmentHeading(page)).toContainText("Richmond Park (example)");
    await manage(page, "Delete segment");
    await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
      "data-defined",
      "false",
    );
    await page.reload();
    await expect(page.getByTestId("segment-slot-1")).toHaveAttribute(
      "data-defined",
      "false",
    );
    await expect(segmentHeading(page)).toHaveCount(0);
  });
});
