import { aRoute, expect, slider, test } from "./fixtures";

// Southerly all day; hours 0–5 are night, hour 6 rains.
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

test.use({ fixedTime: "2026-09-10T07:00:00Z" });
const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };

test("night and wet bands mark the hours on the timeline", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  const nightBands = page.getByTestId("band-night");
  await expect(nightBands).toHaveCount(1);
  await expect(nightBands.first()).toHaveAttribute("data-from", "0");
  await expect(nightBands.first()).toHaveAttribute("data-to", "5");
  const wetBands = page.getByTestId("band-wet");
  await expect(wetBands).toHaveCount(1);
  await expect(wetBands.first()).toHaveAttribute("data-from", "6");
});

test("dry daylight only moves the best hour past the rain", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await page.getByRole("button", { name: "Best hour", exact: true }).click();
  await expect(slider(page)).toHaveValue("6");
  await page.getByLabel("Dry daylight only").check();
  await page.getByRole("button", { name: "Best hour", exact: true }).click();
  await expect(slider(page)).toHaveValue("7");
});

test("the hourly table names rain and night", async ({ page, seed }) => {
  await seed(seeded);
  await page.getByText("Hourly times", { exact: true }).click();
  const rows = page.locator(".hourly-time-table tbody tr");
  await expect(rows.nth(6).locator("td").last()).toHaveText("Rain");
  await expect(rows.first().locator("td").last()).toContainText("night");
});

test("rider power changes the still-air time and persists across reload", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await expect(page.getByTestId("rider-summary")).toContainText(
    "Reference rider · 40.0 km/h",
  );
  const calmBefore = await page.getByTestId("segment-calm-time").innerText();
  await page.getByText("Rider", { exact: false }).first().click();
  await page.getByLabel("Sustained power").fill("400");
  await expect(page.getByTestId("rider-summary")).toContainText("Your numbers");
  await expect(page.getByTestId("segment-calm-time")).not.toHaveText(
    calmBefore,
  );
  await page.reload();
  await expect(page.getByTestId("rider-summary")).toContainText("Your numbers");
});

test("an out-of-range CdA is refused and the saved numbers stand", async ({
  page,
  seed,
}) => {
  await seed(seeded);
  await page.getByText("Rider", { exact: false }).first().click();
  await page.getByLabel("Sustained power").fill("400");
  await page.getByLabel("CdA").fill("0.9");
  await expect(page.locator(".rider-note")).toContainText("CdA must be");
  await expect(page.getByTestId("rider-summary")).toContainText("Your numbers");
});

test("use reference rider restores the default pace", async ({
  page,
  seed,
}) => {
  await seed({
    ...seeded,
    rider: { powerW: 400, massKg: 85, cdaM2: 0.3 },
  });
  await expect(page.getByTestId("rider-summary")).toContainText("Your numbers");
  await page.getByText("Rider", { exact: false }).first().click();
  await page.getByRole("button", { name: "Use reference rider" }).click();
  await expect(page.getByTestId("rider-summary")).toContainText(
    "Reference rider · 40.0 km/h",
  );
});
