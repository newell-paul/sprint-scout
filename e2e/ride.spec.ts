import { expect, test } from "./fixtures";
import { routesKey } from "./pages";

const savedPoints = (page: import("@playwright/test").Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]"), routesKey) as Promise<
    { name: string; points: [number, number][] }[]
  >;

test("a segment cut from a ride with the sliders saves like a drawn one, with no request for the file @a11y @mobile", async ({
  page,
  planner,
  externalRequests,
  aria,
}) => {
  await planner.open();
  await planner.map.waitUntilInteractive();

  await planner.ride.open("northbound-two-laps");
  const before = externalRequests.filter((url) => !url.includes("tile.openstreetmap.org")).length;
  await expect(planner.editor.guidance).toHaveText("Tap the start of your segment on the ride.");
  await aria("ride-source-open", planner.ride.region);

  await planner.ride.start.fill("20");
  await planner.ride.finish.fill("100");

  await expect(planner.editor.guidance).toHaveText(
    "Segment cut from your ride. Tap to pick a new start, or save below.",
  );
  await expect(planner.editor.pointCount(2)).toBeVisible();
  // Saving permits the forecast for the new segment; opening and cutting the ride permit nothing.
  expect(externalRequests.filter((url) => !url.includes("tile.openstreetmap.org"))).toHaveLength(before);
  await planner.editor.name("Cut from a ride");
  await planner.editor.confirmOwnership();
  await planner.editor.save();

  await expect(planner.library.heading).toContainText("Cut from a ride");
  await expect(planner.ride.start).toBeHidden();
  const [saved] = await savedPoints(page);
  expect(saved!.points).toHaveLength(2);
  expect(saved!.points[1]![1]).toBeGreaterThan(saved!.points[0]![1]);
});

test("taps pick the start, then the finish, and a tap off the ride picks nothing", async ({ planner }) => {
  await planner.open();
  await planner.map.waitUntilInteractive();
  await planner.ride.open("northbound-two-laps");
  const box = (await planner.map.region.boundingBox())!;

  await planner.map.clickAt(box.width / 2, box.height / 2);
  await expect(planner.editor.guidance).toHaveText("Now tap the finish on the ride.");
  await expect(planner.editor.pointCount(1)).toBeVisible();

  await planner.map.clickAt(box.width / 2, 60);
  await expect(planner.editor.guidance).toHaveText(
    "Segment cut from your ride. Tap to pick a new start, or save below.",
  );
  await expect(planner.editor.pointCount(2)).toBeVisible();

  await planner.map.clickAt(12, box.height / 2);
  await expect(planner.editor.guidance).toHaveText("Tap on the ride's line.");
  await expect(planner.editor.pointCount(2)).toBeVisible();
});

test("closing the ride keeps the cut, and cancel discards the ride with the drawing", async ({ planner }) => {
  await planner.open();
  await planner.ride.open("northbound-two-laps");
  await planner.ride.start.fill("20");
  await planner.ride.finish.fill("100");
  await expect(planner.editor.pointCount(2)).toBeVisible();

  await planner.ride.closeButton.click();
  await expect(planner.ride.start).toBeHidden();
  await expect(planner.editor.pointCount(2)).toBeVisible();
  await expect(planner.editor.guidance).toHaveText("Tap to add bends, then save below.");

  await planner.ride.openInput.setInputFiles("e2e/data/northbound-two-laps.gpx");
  await expect(planner.ride.start).toBeVisible();
  await planner.editor.cancel();
  await expect(planner.editor.pointCount(0)).toBeVisible();
  await expect(planner.ride.start).toBeHidden();
});

test("a file that is not a ride says so", async ({ planner }) => {
  await planner.open();
  await planner.ride.toggle.click();
  await planner.ride.ownership.check();

  await planner.ride.openInput.setInputFiles("e2e/data/not-a-track.gpx");

  await expect(planner.ride.status).toHaveText("GPX file contains no track points.");
  await expect(planner.ride.start).toBeHidden();
});
