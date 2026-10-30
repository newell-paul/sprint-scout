import { expect, test } from "./fixtures";

test("the footer ends with SprintScout's version pill, and the header has none @a11y @mobile", async ({
  page,
  planner,
}) => {
  await planner.open();

  const badge = page.locator("footer").getByRole("link", { name: /^SprintScout v\d+\.\d+\.\d+/ });
  await expect(badge).toHaveText(/^SprintScout v\d+\.\d+\.\d+$/);
  await expect(badge).toHaveAttribute(
    "href",
    /^https:\/\/github\.com\/newell-paul\/sprint-scout\/releases\/tag\/v\d+\.\d+\.\d+$/,
  );
  await expect(page.locator("header")).not.toContainText(/v\d+\.\d+\.\d+/);
  expect(await planner.horizontalOverflow()).toBe(0);
});
