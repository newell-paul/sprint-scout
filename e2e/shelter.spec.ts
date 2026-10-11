import { aRoute, expect, segmentTime, test } from "./fixtures";

test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 5, direction: 180, gust: 10 };
});

const twoSprints = () =>
  [0, 1].map((slot) =>
    aRoute({ id: `sprint-${slot}`, name: `Sprint ${slot + 1}`, slot }),
  );
const preset = (page: import("@playwright/test").Page, name: string) =>
  page
    .getByRole("group", { name: "Shelter level" })
    .getByRole("button", { name, exact: true });

test("dense shelter shortens the tailwind benefit and leaves the weather alone", async ({
  page,
  seed,
}) => {
  await seed({ routes: twoSprints() });
  await expect(preset(page, "Exposed 0% wind reduction")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(segmentTime(page)).not.toHaveText("Unavailable");
  const before = await segmentTime(page).innerText();
  const conditions = page.getByRole("region", { name: "Attempt conditions" });
  const weather = await conditions.innerText();
  await preset(page, "Dense 65% wind reduction").click();
  await expect(segmentTime(page)).not.toHaveText(before);
  await expect(page.getByTestId("ride-cockpit")).toContainText(
    "Exposed comparison",
  );
  await expect(page.getByTestId("ride-cockpit")).toContainText(before);
  await expect(page.getByTestId("shelter-assumption")).toHaveText(
    "Dense · assumed shelter",
  );
  await expect(conditions).toHaveText(weather, { useInnerText: true });
});

test("shelter is per segment and persists across reload", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: twoSprints() });
  await preset(page, "Dense 65% wind reduction").click();
  const after = await segmentTime(page).innerText();
  await page.getByTestId("segment-slot-2").click();
  await expect(preset(page, "Exposed 0% wind reduction")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("segment-slot-1").click();
  await expect(preset(page, "Dense 65% wind reduction")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(preset(page, "Dense 65% wind reduction")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(segmentTime(page)).toHaveText(after);
  expect(openMeteo.calls.weather).toBe(2);
});

test("the board carries the assumption and opens the same estimate", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({
    routes: [aRoute({ id: "sprint-0", name: "Sprint 1", shelter: "dense" })],
  });
  const after = await segmentTime(page).innerText();
  await page.getByRole("button", { name: "Rank my segments" }).click();
  const row = page.getByTestId("board-row").filter({ hasText: "Sprint 1" });
  await expect(row).toContainText("Dense · assumed shelter");
  await row.getByRole("button", { name: "Open" }).click();
  await expect(segmentTime(page)).toHaveText(after);
  expect(openMeteo.calls.weather).toBe(1);
});

test("a preset can be chosen with the keyboard @keyboard", async ({
  page,
  seed,
}) => {
  await seed({ routes: twoSprints() });
  await preset(page, "Sheltered 35% wind reduction").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("shelter-assumption")).toHaveText(
    "Sheltered · assumed shelter",
  );
});

test("back to exposed restores the original estimate", async ({
  page,
  seed,
}) => {
  await seed({ routes: twoSprints() });
  const before = await segmentTime(page).innerText();
  await preset(page, "Dense 65% wind reduction").click();
  await expect(segmentTime(page)).not.toHaveText(before);
  await preset(page, "Exposed 0% wind reduction").click();
  await expect(segmentTime(page)).toHaveText(before);
  await expect(page.getByTestId("shelter-assumption")).toHaveCount(0);
});

test("the shelter choices fit a phone @mobile-only @mobile", async ({
  page,
  seed,
}) => {
  await seed({ routes: twoSprints() });
  await expect(preset(page, "Dense 65% wind reduction")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
});
