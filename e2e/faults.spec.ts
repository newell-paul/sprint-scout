import { aRoute, expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

// Fills localStorage in shrinking blocks until nothing more fits.
const fillStorage = (page: Page) =>
  page.evaluate(() => {
    let index = 0;
    for (const size of [512 * 1024, 32 * 1024, 2 * 1024, 128, 8]) {
      const block = "x".repeat(size);
      try {
        for (let attempt = 0; attempt < 512; attempt++) localStorage.setItem(`filler-${index++}`, block);
      } catch {
        /* this block size no longer fits; try a smaller one */
      }
    }
  });
const freeStorage = (page: Page) =>
  page.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith("filler-")) localStorage.removeItem(key);
  });

test.describe("forecast timeout", () => {
  test.use({ installClock: true });

  test.beforeEach(({ openMeteo }) => {
    openMeteo.faults.weather = "timeout";
  });

  test("a forecast that never answers times out", async ({ page, planner, seed }) => {
    await seed(seeded);
    await expect(planner.timeline.placeholder).toBeVisible();

    await page.clock.runFor(12_500);

    await expect(planner.alert).toContainText("Forecast request timed out or was cancelled.");
  });

  test("try again recovers after a timeout", async ({ page, planner, seed, openMeteo }) => {
    await seed(seeded);
    await expect(planner.timeline.placeholder).toBeVisible();
    await page.clock.runFor(12_500);
    await expect(planner.alert).toBeVisible();
    openMeteo.faults.weather = "ok";

    await planner.timeline.tryAgain();

    await expect(planner.timeline.slider).toBeVisible();
    await expect(planner.alert).toHaveCount(0);
    expect(openMeteo.calls.weather).toBe(2);
  });
});

test.describe("rate limit", () => {
  test.use({ installClock: true });

  test.beforeEach(({ openMeteo }) => {
    openMeteo.faults.weather = "rateLimit";
  });

  test("a rate-limited forecast says so and offers a retry", async ({ planner, seed }) => {
    await seed(seeded);

    await expect(planner.alert).toContainText("Weather service rate limit reached. Try again later.");
    await expect(planner.timeline.tryAgainButton).toBeVisible();
  });

  test("a rate-limited forecast does not retry on its own", async ({ page, planner, seed, openMeteo }) => {
    await seed(seeded);
    await expect(planner.alert).toBeVisible();

    // Long enough for any backoff a retry would plausibly use.
    await page.clock.runFor(5 * 60_000);

    expect(openMeteo.calls.weather).toBe(1);
  });
});

test("an empty forecast body is reported as unusable", async ({ planner, seed, openMeteo }) => {
  openMeteo.faults.weather = "empty";

  await seed(seeded);

  await expect(planner.alert).toBeVisible();
  await expect(planner.timeline.slider).toHaveCount(0);
});

test("map tiles failing to load leaves the map usable", async ({ planner, seed, externalRequests }) => {
  await seed(seeded);

  await expect(planner.map.region).toBeVisible();
  await expect(planner.map.overlay).toBeVisible();
  await expect
    .poll(() => externalRequests.filter((url) => url.includes("tile.openstreetmap.org")).length)
    .toBeGreaterThan(0);
});

test.describe("with the forecast unavailable", () => {
  test.beforeEach(({ openMeteo }) => {
    openMeteo.faults.weather = "outage";
  });

  test("a full storage quota refuses the save", async ({ page, planner, seed }) => {
    await seed({ routes: [aRoute({ id: "kept", name: "Kept segment" })] });
    await fillStorage(page);
    await planner.library.selectSlot(2);

    await planner.editor.draft("Will not fit");
    await planner.editor.save();

    await expect(planner.status).toContainText("Could not save changes. Storage may be full");
  });

  test("a refused save preserves the existing routes", async ({ page, planner, seed }) => {
    await seed({ routes: [aRoute({ id: "kept", name: "Kept segment" })] });
    await fillStorage(page);
    await planner.library.selectSlot(2);
    await planner.editor.draft("Will not fit");
    await planner.editor.save();
    await expect(planner.status).toContainText("Could not save changes");

    await freeStorage(page);
    await planner.reload();

    await expect(planner.library.slot(1)).toHaveAttribute("data-defined", "true");
    await expect(planner.library.slot(2)).toHaveAttribute("data-defined", "false");
  });

  test("unreadable saved routes are reported", async ({ planner }) => {
    await planner.openWithStoredRoutes("{not json");

    await expect(planner.status).toHaveText("Cannot read saved routes. Existing data is preserved.");
  });

  test("a save over unreadable routes is refused and leaves them in place", async ({ planner }) => {
    await planner.openWithStoredRoutes("{not json");
    await planner.editor.draft("Fresh segment");
    await expect(planner.editor.saveButton).toBeEnabled();

    await planner.editor.save();

    await expect(planner.status).toHaveText(
      "Could not save changes. Storage may be full, unavailable, or invalid; existing routes are preserved.",
    );
    expect(await planner.storedRoutes()).toBe("{not json");
  });
});
