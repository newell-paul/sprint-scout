import { aRoute, expect, test } from "./fixtures";

const fiveSaved = () =>
  Array.from({ length: 5 }, (_, slot) =>
    aRoute({
      id: `saved-${slot}`,
      name: `Saved segment ${slot + 1}`,
      slot,
      createdAt: "2026-09-10T12:00:00Z",
    }),
  );

test.beforeEach(({ openMeteo }) => {
  openMeteo.faults.weather = "outage";
});

test("a growing library scrolls on a phone without widening the page @mobile-only @mobile", async ({
  planner,
  seed,
}) => {
  await seed({ routes: fiveSaved() });
  await expect(planner.library.scrollLeftButton).toBeDisabled();

  await planner.library.scrollRight();

  await expect.poll(() => planner.library.stripScrollLeft()).toBeGreaterThan(0);
  await expect(planner.library.scrollLeftButton).toBeEnabled();
  expect(await planner.horizontalOverflow()).toBe(0);
});

test("the sixth segment saves into slot 6 and leaves slot 7 empty", async ({
  planner,
  seed,
}) => {
  await seed({ routes: fiveSaved() });

  await planner.library.selectSlot(6);
  await planner.editor.drawSegment("Sixth sprint");

  await expect(planner.library.slot(6)).toHaveAttribute("aria-pressed", "true");
  await expect(planner.library.slot(7)).toHaveAttribute(
    "data-defined",
    "false",
  );
});

test("a sixth segment persists and the strip offers seven slots", async ({
  planner,
  seed,
}) => {
  await seed({ routes: fiveSaved() });
  await planner.library.selectSlot(6);
  await planner.editor.drawSegment("Sixth sprint");

  await planner.reload();
  await planner.library.selectSlot(6);

  await expect(planner.library.heading).toContainText("Sixth sprint");
  await expect(planner.library.slotButtons()).toHaveCount(7);
});

test("the planner opens on the lowest saved slot", async ({
  planner,
  seed,
}) => {
  const routes = [aRoute({ id: "later", name: "Later slot", slot: 3 })];

  await seed({ routes });

  await expect(planner.library.slot(4)).toHaveAttribute("aria-pressed", "true");
  await expect(planner.library.heading).toContainText("Later slot");
});
