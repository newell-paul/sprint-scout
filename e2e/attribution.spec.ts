import { expect, test } from "./fixtures";

test.describe("map credit", () => {
  test.use({ installClock: true });

  test("the credit's info button sits inside the credit", async ({ planner }) => {
    await planner.open();
    await expect(planner.map.creditText).toBeVisible();

    const credit = await planner.map.credit.boundingBox();
    const button = await planner.map.creditButton.boundingBox();

    expect(button!.y + button!.height).toBeLessThanOrEqual(credit!.y + credit!.height);
  });

  test("the credit shows on load, shrinks to its info button after five seconds and comes back on a tap", async ({
    page,
    planner,
  }) => {
    await planner.open();
    await expect(planner.map.creditText).toBeVisible();

    await page.clock.runFor(5_000);

    await expect(planner.map.creditText).toBeHidden();
    await planner.map.creditButton.click();
    await expect(planner.map.creditText).toBeVisible();
  });
});
