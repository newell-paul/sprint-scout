import type { Page } from "@playwright/test";
import { aRoute, expect, test } from "./fixtures";
import { routesKey } from "./pages";

const original = {
  routes: [aRoute({ id: "original", name: "Original route" })],
};

// What another tab does: write the library and fire the storage event.
const otherTabRenames = (page: Page) =>
  page.evaluate((key) => {
    const routes = JSON.parse(localStorage.getItem(key)!);
    routes[0].name = "Other tab version";
    localStorage.setItem(key, JSON.stringify(routes));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  }, routesKey);
const otherTabReplaces = (page: Page) =>
  page.evaluate((key) => {
    localStorage.setItem(
      key,
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
  }, routesKey);

test.beforeEach(({ openMeteo }) => {
  openMeteo.faults.weather = "outage";
});

test("a save is refused when another tab changed the segment and the draft stays", async ({
  page,
  planner,
  seed,
}) => {
  await seed(original);
  await planner.library.redraw();
  await planner.editor.name("My draft");
  await planner.editor.confirmOwnership();
  await otherTabRenames(page);

  await planner.editor.save();

  await expect(planner.status).toContainText("Could not save changes");
  await expect(planner.editor.routeName).toHaveValue("My draft");
});

test("cancelling after another tab's change shows that tab's version", async ({
  page,
  planner,
  seed,
}) => {
  await seed(original);
  await planner.library.redraw();
  await otherTabRenames(page);

  await planner.editor.cancel();

  await expect(planner.library.heading).toContainText("Other tab version");
});

test("undo delete is refused when another tab replaced the slot", async ({
  page,
  planner,
  seed,
}) => {
  await seed(original);
  await planner.library.delete();
  await otherTabReplaces(page);

  await planner.library.undoDelete();

  await expect(planner.status).toContainText("Could not save changes");
});

test("another tab's replacement survives a refused undo delete", async ({
  page,
  planner,
  seed,
}) => {
  await seed(original);
  await planner.library.delete();
  await otherTabReplaces(page);

  await planner.library.undoDelete();
  await planner.reload();

  await expect(planner.library.heading).toContainText("Replacement route");
});
