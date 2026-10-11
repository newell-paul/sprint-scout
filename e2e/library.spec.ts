import { aRoute, drawSegment, expect, segmentHeading, test } from "./fixtures";

const fiveSaved = () =>
  Array.from({ length: 5 }, (_, slot) =>
    aRoute({
      id: `saved-${slot}`,
      name: `Saved segment ${slot + 1}`,
      slot,
      createdAt: "2026-09-10T12:00:00Z",
    }),
  );

test("a growing library scrolls on a phone without widening the page @mobile-only @mobile", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: fiveSaved() });
  const strip = page.getByRole("group", { name: "Segments", exact: true });
  await expect(
    page.getByRole("button", { name: "Scroll segments left" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Scroll segments right" }).click();
  await expect
    .poll(() => strip.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Scroll segments left" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
});

test("the sixth segment saves into slot 6 and leaves slot 7 empty", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({ routes: fiveSaved() });
  await page.getByTestId("segment-slot-6").click();
  await drawSegment(page, "Sixth sprint");
  await expect(page.getByTestId("segment-slot-6")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("segment-slot-7")).toHaveAttribute(
    "data-defined",
    "false",
  );
  await page.reload();
  await page.getByTestId("segment-slot-6").click();
  await expect(segmentHeading(page)).toContainText("Sixth sprint");
  await expect(
    page
      .getByRole("group", { name: "Segments", exact: true })
      .getByRole("button"),
  ).toHaveCount(7);
});

test("the planner opens on the lowest saved slot", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  await seed({
    routes: [aRoute({ id: "later", name: "Later slot", slot: 3 })],
  });
  await expect(page.getByTestId("segment-slot-4")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(segmentHeading(page)).toContainText("Later slot");
});
