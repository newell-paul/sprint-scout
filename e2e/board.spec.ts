import { aRoute, expect, slider, test } from "./fixtures";

test.use({ fixedTime: "2026-09-10T07:00:00Z" });
const northbound = aRoute({ id: "north", name: "Northbound", slot: 0 });
const southbound = aRoute({
  id: "south",
  name: "Southbound",
  slot: 1,
  points: [
    [-0.2, 51.51],
    [-0.2, 51.5],
  ],
});

test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 4, direction: 180, gust: null };
  openMeteo.hours = Object.fromEntries(
    Array.from({ length: 48 }, (_, i) => [
      i,
      i === 6
        ? { speed: 8, code: 61 }
        : i < 6
          ? { speed: 7, code: 1, isDay: 0 as const }
          : { code: 1 },
    ]),
  );
});

test("ranking fetches one forecast per segment and puts the gain first @smoke @a11y", async ({
  page,
  seed,
  openMeteo,
  aria,
}) => {
  await seed({ routes: [northbound, southbound] });
  await expect.poll(() => openMeteo.weatherLongitudes).toEqual(["-0.12"]);
  await page.getByRole("button", { name: "Rank my segments" }).click();
  const rows = page.getByTestId("board-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toHaveAttribute("data-status", "ranked");
  await expect(rows.nth(1)).toHaveAttribute("data-status", "ranked");
  await expect(rows.first()).toContainText("Northbound");
  await expect(rows.first().locator(".board-gain")).toHaveAttribute(
    "data-tone",
    "gain",
  );
  await expect(rows.nth(1)).toContainText("Southbound");
  await expect(rows.nth(1).locator(".board-gain")).toHaveAttribute(
    "data-tone",
    "loss",
  );
  expect(openMeteo.weatherLongitudes).toEqual(["-0.12", "-0.2"]);
  await aria("board-ranked", page.getByTestId("opportunity-board"));
});

test("open jumps to that segment's best hour without a new request", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: [northbound, southbound] });
  await page.getByLabel("Dry daylight only").check();
  await page.getByRole("button", { name: "Rank my segments" }).click();
  const rows = page.getByTestId("board-row");
  await rows.nth(1).getByRole("button", { name: "Open" }).click();
  await expect(page.getByTestId("segment-slot-2")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(slider(page)).toHaveValue("7");
  await expect(page.getByTestId("ride-cockpit")).toHaveAttribute(
    "data-tone",
    "loss",
  );
  expect(openMeteo.weatherLongitudes).toEqual(["-0.12", "-0.2"]);
});

test("refresh asks every segment again", async ({ page, seed, openMeteo }) => {
  await seed({ routes: [northbound, southbound] });
  await page.getByRole("button", { name: "Rank my segments" }).click();
  await expect(page.getByTestId("board-row")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();
  expect(openMeteo.calls.weather).toBe(4);
});

test("a segment whose forecast fails stays unranked with the reason", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: [northbound, southbound] });
  openMeteo.faults.weather = "outage";
  await page.getByRole("button", { name: "Rank my segments" }).click();
  const rows = page.getByTestId("board-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Southbound" })).toHaveAttribute(
    "data-status",
    "unavailable",
  );
  await expect(
    rows
      .filter({ hasText: "Southbound" })
      .getByRole("button", { name: "Open" }),
  ).toBeDisabled();
});

test("the board is fine on a phone @mobile-only @mobile", async ({
  page,
  seed,
}) => {
  await seed({ routes: [northbound, southbound] });
  await page.getByRole("button", { name: "Rank my segments" }).click();
  await expect(page.getByTestId("board-row")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
});
