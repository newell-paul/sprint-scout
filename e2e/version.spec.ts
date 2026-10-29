import { expect, test } from "./fixtures";

test("the header names SprintScout's version beside the wordmark, and the footer has none @a11y @mobile", async ({
  page,
  planner,
}) => {
  await planner.open();

  const badge = page.locator("header").getByRole("link", { name: /^SprintScout v\d+\.\d+\.\d+/ });
  await expect(badge).toHaveText(/^v\d+\.\d+\.\d+$/);
  await expect(badge).toHaveAttribute(
    "href",
    /^https:\/\/github\.com\/newell-paul\/sprint-scout\/releases\/tag\/v\d+\.\d+\.\d+$/,
  );
  await expect(page.getByRole("heading", { name: "SprintScout", level: 1 })).toBeVisible();
  await expect(page.locator("footer")).not.toContainText(/v\d+\.\d+\.\d+/);
  expect(await planner.horizontalOverflow()).toBe(0);
});
