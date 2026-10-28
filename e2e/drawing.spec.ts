import { aRoute, expect, test } from "./fixtures";

const saved = { routes: [aRoute({ name: "Independent ride" })] };

test("the click that hands a new segment's map control also places the start", async ({ planner }) => {
  await planner.open();
  await expect(planner.map.region).toHaveAttribute("data-map-active", "false");

  await planner.map.clickAt(120, 120);

  await expect(planner.map.region).toHaveAttribute("data-map-active", "true");
  await expect(planner.editor.pointCount(1)).toBeVisible();
  await expect(planner.editor.guidance).toHaveText("Now tap the finish. Lines go straight between points.");
});

test("while a route is being drawn the map keeps control when the mouse leaves", async ({ planner }) => {
  await planner.open();
  await planner.map.waitUntilInteractive();
  await planner.map.clickAt(120, 120);
  await expect(planner.editor.pointCount(1)).toBeVisible();

  await planner.map.moveMouseAway();

  await expect(planner.map.region).toHaveAttribute("data-map-active", "true");
});

test("with no points drawn the map gives control back when the mouse leaves", async ({ planner }) => {
  await planner.open();
  await planner.map.waitUntilInteractive();
  await planner.map.region.getByRole("button", { name: "Zoom in" }).click();
  await expect(planner.map.region).toHaveAttribute("data-map-active", "true");
  await expect(planner.editor.pointCount(0)).toBeVisible();

  await planner.map.moveMouseAway();

  await expect(planner.map.region).toHaveAttribute("data-map-active", "false");
});

test.describe("with the forecast unavailable", () => {
  test.beforeEach(({ openMeteo }) => {
    openMeteo.faults.weather = "outage";
  });

  test("coordinates add points to the draft", async ({ planner }) => {
    await planner.open();

    await planner.editor.plot();

    await expect(planner.editor.pointCount(2)).toBeVisible();
  });

  test("the bar asks for the start, then the finish, then bends", async ({ planner }) => {
    await planner.open();
    await expect(planner.editor.guidance).toHaveText("Tap the map to place your start.");
    await planner.editor.useCoordinates();

    await planner.editor.addPoint([-0.12, 51.5]);
    await expect(planner.editor.guidance).toHaveText("Now tap the finish. Lines go straight between points.");
    await planner.editor.addPoint([-0.12, 51.51]);

    await expect(planner.editor.guidance).toHaveText("Tap to add bends, then save below.");
  });

  test("with nothing saved and nothing drawn there is nothing to cancel", async ({ planner }) => {
    await planner.open();

    await expect(planner.editor.guidance).toBeVisible();
    await expect(planner.editor.cancelButton).toHaveCount(0);
  });

  test("a new segment saves under its default name", async ({ planner }) => {
    await planner.open();
    await planner.editor.plot();
    await expect(planner.editor.segmentName).toHaveValue("Segment 1");

    await planner.editor.confirmOwnership();
    await planner.editor.save();

    await expect(planner.library.heading).toContainText("Segment 1");
  });

  test("cancel on a new segment with nothing drawn goes back without a notice", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.selectSlot(2);

    await planner.editor.cancel();

    await expect(planner.library.heading).toContainText("Independent ride");
    await expect(planner.library.slot(1)).toHaveAttribute("aria-pressed", "true");
    await expect(planner.editor.restoreButton).toHaveCount(0);
  });

  test("cancel after drawing goes back, and Restore brings the drawing back", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.selectSlot(2);
    await planner.editor.plot();

    await planner.editor.cancel();
    await expect(planner.library.heading).toContainText("Independent ride");
    await planner.editor.restore();

    await expect(planner.library.slot(2)).toHaveAttribute("aria-pressed", "true");
    await expect(planner.editor.pointCount(2)).toBeVisible();
  });

  test("the board stays with the saved segments, not the new one", async ({ planner, seed }) => {
    await seed(saved);
    await expect(planner.board.region).toBeVisible();

    await planner.library.selectSlot(2);

    await expect(planner.board.region).toHaveCount(0);
  });

  test("clicking the tab of the segment being drawn keeps the drawing", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.selectSlot(2);
    await planner.editor.plot();

    await planner.library.selectSlot(2);

    await expect(planner.editor.pointCount(2)).toBeVisible();
    await expect(planner.editor.restoreButton).toHaveCount(0);
  });

  test("Escape cancels a drawing", async ({ page, planner, seed }) => {
    await seed(saved);
    await planner.library.selectSlot(2);
    await planner.editor.plot();

    await page.keyboard.press("Escape");

    await expect(planner.library.heading).toContainText("Independent ride");
    await expect(planner.editor.restoreButton).toBeVisible();
  });

  test("picking another segment while drawing opens it, and Restore brings the drawing back", async ({
    planner,
    seed,
  }) => {
    await seed(saved);
    await planner.library.selectSlot(2);
    await planner.editor.plot();

    await planner.library.selectSlot(1);
    await expect(planner.library.heading).toContainText("Independent ride");
    await planner.editor.restore();

    await expect(planner.library.slot(2)).toHaveAttribute("aria-pressed", "true");
    await expect(planner.editor.pointCount(2)).toBeVisible();
  });

  test("reverse puts the finish first", async ({ planner }) => {
    await planner.open();
    await planner.editor.plot();

    await planner.editor.reverse();
    await planner.editor.showPoints();

    await expect(planner.editor.points.first()).toContainText("51.51000, -0.12000 — start");
  });

  test("an out-of-range coordinate is refused with the valid ranges", async ({ planner }) => {
    await planner.open();
    await planner.editor.useCoordinates();

    await planner.editor.addPoint([0, 91]);

    await expect(planner.status).toHaveText("Enter longitude −180 to 180 and latitude −85 to 85.");
    await expect(planner.editor.pointCount(0)).toBeVisible();
  });

  test("save stays disabled and explains why until the independent-source box is ticked @a11y", async ({ planner }) => {
    await planner.open();

    await planner.editor.plot();
    await planner.editor.name("Independent ride");

    await expect(planner.editor.saveButton).toBeDisabled();
    await expect(planner.editor.saveButton).toHaveAccessibleDescription(
      "Tick the independent-source confirmation above to enable Save segment.",
    );
  });

  test("ticking the independent-source box enables save @a11y", async ({ planner, aria }) => {
    await planner.open();
    await planner.editor.plot();
    await planner.editor.name("Independent ride");

    await planner.editor.confirmOwnership();

    await expect(planner.editor.saveButton).toBeEnabled();
    await aria("drawing-ready-to-save", planner.editor.region);
  });

  test("a saved route persists across reload @smoke", async ({ planner }) => {
    await planner.open();
    await planner.editor.drawSegment("Independent ride");

    await planner.reload();

    await expect(planner.library.slot(1)).toHaveAttribute("data-defined", "true");
    await expect(planner.library.heading).toContainText("Independent ride");
  });

  test("the slot after a saved route is empty @smoke", async ({ planner }) => {
    await planner.open();
    await planner.editor.drawSegment("Independent ride");

    await planner.library.selectSlot(2);

    await expect(planner.library.slot(2)).toHaveAttribute("data-defined", "false");
    await expect(planner.editor.guidance).toHaveText("Tap the map to place your start.");
  });

  test("redraw loads the saved points", async ({ planner, seed }) => {
    await seed(saved);

    await planner.library.redraw();

    await expect(planner.editor.pointCount(2)).toBeVisible();
  });

  test("undo removes the last point", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.redraw();

    await planner.editor.undoPoint();

    await expect(planner.editor.pointCount(1)).toBeVisible();
  });

  test("an edited redraw that is cancelled leaves the saved segment in place", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.redraw();

    await planner.editor.undoPoint();
    await planner.editor.cancel();
    await planner.reload();

    await expect(planner.library.slot(1)).toHaveAttribute("data-defined", "true");
    await expect(planner.library.heading).toContainText("Independent ride");
  });

  test("cancelling a redraw keeps the saved name", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.redraw();
    await planner.editor.name("Cancelled name");

    await planner.editor.cancel();

    await expect(planner.library.heading).toContainText("Independent ride");
  });

  test("a redraw with a new name renames the segment and persists", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.redraw();

    await planner.editor.name("Updated ride");
    await planner.editor.confirmOwnership();
    await planner.editor.save();
    await planner.reload();

    await expect(planner.library.heading).toContainText("Updated ride");
  });

  test("renaming keeps the segment's target, shelter and efforts", async ({ planner, seed }) => {
    const effort = {
      id: "e1",
      startedAt: "2026-09-01T07:00:00.000Z",
      elapsedSeconds: 95,
      source: "gpx",
      fileName: "ride.gpx",
      geometryKey: JSON.stringify(saved.routes[0]!.points),
      maxDeviationM: 3,
      sampleGapSeconds: 1,
      importedAt: "2026-09-02T07:00:00.000Z",
      wind: null,
    };
    await seed({ routes: [{ ...saved.routes[0]!, targetTimeS: 90, shelter: "dense", efforts: [effort] }] });
    await planner.library.redraw();

    await planner.editor.name("Updated ride");
    await planner.editor.confirmOwnership();
    await planner.editor.save();

    await expect(planner.library.heading).toContainText("Updated ride");
    const [stored] = JSON.parse((await planner.storedRoutes())!);
    expect(stored).toMatchObject({ name: "Updated ride", targetTimeS: 90, shelter: "dense", efforts: [effort] });
  });

  test("delete empties the slot", async ({ planner, seed }) => {
    await seed(saved);

    await planner.library.delete();

    await expect(planner.library.slot(1)).toHaveAttribute("data-defined", "false");
  });

  test("undo delete restores the segment and it persists", async ({ planner, seed }) => {
    await seed(saved);
    await planner.library.delete();

    await planner.library.undoDelete();
    await planner.reload();

    await expect(planner.library.heading).toContainText("Independent ride");
  });
});

test("a saved segment is painted on the map @smoke", async ({ page, planner }) => {
  await page.route(/tile\.openstreetmap\.org/, (route) => route.abort());
  await planner.open();

  await planner.editor.drawSegment("Painted ride");

  await expect.poll(() => planner.map.painted("#f97316"), { timeout: 10000 }).toBeGreaterThan(300);
});

test.describe("first visit", () => {
  test.use({ firstVisit: true });

  test.beforeEach(({ openMeteo }) => {
    openMeteo.faults.weather = "outage";
  });

  test("opens on the example segment and keeps it across reload @smoke", async ({ planner }) => {
    await planner.open();
    await planner.reload();

    await expect(planner.library.heading).toContainText("Richmond Park (example)");
    await expect(planner.library.slot(1)).toHaveAttribute("data-defined", "true");
  });

  test("a deleted example stays deleted after reload @smoke", async ({ planner }) => {
    await planner.open();

    await planner.library.delete();
    await planner.reload();

    await expect(planner.library.slot(1)).toHaveAttribute("data-defined", "false");
    await expect(planner.library.heading).toHaveCount(0);
  });
});
