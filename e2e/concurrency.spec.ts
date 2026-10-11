import { aRoute, expect, manage, segmentHeading, test } from "./fixtures";

const key = "sprint-scout.drawn-routes.v1";
const otherTabRenames = (page: import("@playwright/test").Page) =>
  page.evaluate((storageKey) => {
    const routes = JSON.parse(localStorage.getItem(storageKey)!);
    routes[0].name = "Other tab version";
    localStorage.setItem(storageKey, JSON.stringify(routes));
    window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
  }, key);

test("a save is refused when another tab changed the segment and the draft stays", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ id: "original", name: "Original route" })] });
  await manage(page, "Redraw segment");
  await page.getByLabel("Route name", { exact: true }).fill("My draft");
  await page.getByRole("checkbox", { name: /created this route/ }).check();
  await otherTabRenames(page);
  await page.getByRole("button", { name: "Save route", exact: true }).click();
  await expect(page.locator("p[role=status]")).toContainText(
    "Could not save changes",
  );
  await expect(page.getByLabel("Route name", { exact: true })).toHaveValue(
    "My draft",
  );
});

test("cancelling after another tab's change shows that tab's version", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ id: "original", name: "Original route" })] });
  await manage(page, "Redraw segment");
  await otherTabRenames(page);
  await page.getByRole("button", { name: "Cancel drawing" }).click();
  await expect(segmentHeading(page)).toContainText("Other tab version");
});

test("undo delete is refused when another tab replaced the slot", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: [aRoute({ id: "original", name: "Original route" })] });
  await manage(page, "Delete segment");
  await page.evaluate((storageKey) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          id: "replacement",
          name: "Replacement route",
          points: [
            [-0.12, 51.5],
            [-0.12, 51.52],
          ],
          confirmed: true,
          createdAt: "2026-09-10T12:00:00Z",
          slot: 0,
        },
      ]),
    );
  }, key);
  await page.getByRole("button", { name: "Undo delete" }).click();
  await expect(page.locator("p[role=status]")).toContainText(
    "Could not save changes",
  );
  await page.reload();
  await expect(segmentHeading(page)).toContainText("Replacement route");
});
