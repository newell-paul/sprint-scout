import { aRoute, expect, test } from "./fixtures";

test(
  "a stretch picked on a GPX ride saves as a segment without leaving the browser",
  { tag: ["@smoke"] },
  async ({ planner, openMeteo }) => {
    await planner.open();
    const { editor } = planner;

    await editor.importRide("northbound-two-laps");
    await expect(editor.guidance).toHaveText("Tap the ride where your segment starts.");
    await expect(editor.saveReason).toHaveText(
      "Tap the ride where your segment starts, or press Use whole track above the map.",
    );
    await editor.useCoordinates();
    await editor.addPoint([-0.12, 51.5]);
    await expect(editor.guidance).toHaveText("Now tap where it finishes, further along the ride.");
    await editor.addPoint([-0.12, 51.51]);

    await expect(planner.status).toContainText("taken from northbound-two-laps.gpx, 102 points.");
    await expect(editor.pointCount(102)).toBeVisible();
    expect(openMeteo.calls).toEqual({ weather: 0 });

    await editor.name("Cut from a ride");
    await editor.confirmOwnership();
    await editor.save();
    await planner.reload();

    await expect(planner.library.heading).toContainText("Cut from a ride");
  },
);

test("several pre-cut files become segments one save at a time", async ({ planner }) => {
  await planner.open();
  const { editor } = planner;

  await editor.importRide("cut-northbound", "cut-eastbound");

  await expect(editor.segmentName).toHaveValue("Northbound sprint");
  await expect(planner.status).toContainText("1 more file after this one.");
  await editor.confirmOwnership();
  await editor.save();
  await expect(editor.segmentName).toHaveValue("Eastbound sprint");
  await expect(editor.pointCount(95)).toBeVisible();
  await editor.confirmOwnership();
  await editor.save();

  const stored = JSON.parse((await planner.storedRoutes()) ?? "[]") as { name: string; slot: number }[];
  expect(stored.map(({ name, slot }) => [name, slot])).toEqual([
    ["Northbound sprint", 0],
    ["Eastbound sprint", 1],
  ]);
});

test("use whole track takes a single file as it is", async ({ planner }) => {
  await planner.open();

  await planner.editor.importRide("cut-northbound");
  await planner.editor.wholeTrackButton.click();

  await expect(planner.editor.pointCount(102)).toBeVisible();
  await expect(planner.editor.segmentName).toHaveValue("Northbound sprint");
});

test("a finish against the ride's direction is refused", async ({ planner }) => {
  await planner.open();
  await planner.editor.importRide("northbound-reversed");
  await planner.editor.useCoordinates();
  await planner.editor.addPoint([-0.12, 51.5]);

  await planner.editor.addPoint([-0.12, 51.51]);

  await expect(planner.status).toHaveText(
    "The ride doesn't pass there after your start. Tap further along it, in the direction you rode.",
  );
  await expect(planner.editor.pointCount(1)).toBeVisible();
});

test("a point away from the ride is refused", async ({ planner }) => {
  await planner.open();
  await planner.editor.importRide("northbound-two-laps");
  await planner.editor.useCoordinates();

  await planner.editor.addPoint([-0.13, 51.5]);

  await expect(planner.status).toHaveText("Tap on the ride's line.");
  await expect(planner.editor.pointCount(0)).toBeVisible();
});

test("undo after the start keeps the ride", async ({ planner }) => {
  await planner.open();
  await planner.editor.importRide("northbound-two-laps");
  await planner.editor.useCoordinates();
  await planner.editor.addPoint([-0.12, 51.5]);

  await planner.editor.undoPoint();

  await expect(planner.editor.guidance).toHaveText("Tap the ride where your segment starts.");
  await expect(planner.editor.pointCount(0)).toBeVisible();
});

test("cancel drops the ride and offers no restore", async ({ planner }) => {
  await planner.open();
  await planner.editor.importRide("northbound-two-laps");

  await planner.editor.cancel();

  await expect(planner.status).toHaveText("Ride import cancelled. Saved segments are unchanged.");
  await expect(planner.editor.guidance).toHaveText("Tap the map to place your start.");
  await expect(planner.editor.restoreButton).toBeHidden();
});

test("a file with no track is refused with its reason", async ({ planner }) => {
  await planner.open();

  await planner.editor.importRide("not-a-track");

  await expect(planner.status).toHaveText("not-a-track.gpx: GPX file contains no track points.");
  await expect(planner.editor.guidance).toHaveText("Tap the map to place your start.");
});

test("a pre-cut file with heights shows its elevation after saving", async ({ planner }) => {
  await planner.open();
  await planner.editor.importRide("cut-northbound");
  await planner.editor.wholeTrackButton.click();

  await planner.editor.confirmOwnership();
  await planner.editor.save();
  await planner.reload();

  await expect(planner.library.heading).toContainText("Northbound sprint");
  await expect(planner.elevation).toContainText("Start 10.0 m · Finish 15.0 m · Rises 5.0 m");
});

test("a file without heights saves a segment with no elevation", async ({ planner }) => {
  await planner.open();
  await planner.editor.importRide("cut-eastbound");
  await planner.editor.wholeTrackButton.click();

  await planner.editor.confirmOwnership();
  await planner.editor.save();

  await expect(planner.library.heading).toContainText("Eastbound sprint");
  await expect(planner.elevation).toBeHidden();
});

test("reversing a cut segment saves it without heights", async ({ planner }) => {
  await planner.open();
  await planner.editor.importRide("cut-northbound");
  await planner.editor.wholeTrackButton.click();

  await planner.editor.reverse();
  await planner.editor.confirmOwnership();
  await planner.editor.save();

  await expect(planner.library.heading).toContainText("Northbound sprint");
  await expect(planner.elevation).toBeHidden();
  const [stored] = JSON.parse((await planner.storedRoutes()) ?? "[]");
  expect(stored).not.toHaveProperty("heightsM");
});

test("renaming a segment keeps its heights", async ({ planner, seed }) => {
  const route = aRoute({ name: "Bridge to bridge" });
  await seed({ routes: [{ ...route, heightsM: route.points.map((_, i) => 14.4 - 2 * i) }] });
  await planner.library.redraw();

  await planner.editor.name("Bridge to bridge up");
  await planner.editor.confirmOwnership();
  await planner.editor.save();

  await expect(planner.library.heading).toContainText("Bridge to bridge up");
  await expect(planner.elevation).toBeVisible();
});
