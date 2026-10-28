import { expect, it } from "vitest";
import { render } from "vitest-browser-react/pure";
import BuildStamp from "./build-stamp";

it("links the version to its release and shows the short commit", async () => {
  const screen = await render(
    <BuildStamp version="0.9.0" commit="0123456789abcdef" />,
  );

  await expect
    .element(screen.getByRole("link", { name: "v0.9.0" }))
    .toHaveAttribute(
      "href",
      "https://github.com/newell-paul/sprint-scout/releases/tag/v0.9.0",
    );
  await expect.element(screen.getByText("0123456")).toBeVisible();
  expect(screen.container.textContent).not.toContain("0123456789");
});

it("shows only the version when the build has no commit", async () => {
  const screen = await render(<BuildStamp version="0.9.0" commit="" />);

  await expect
    .element(screen.getByRole("link", { name: "v0.9.0" }))
    .toBeVisible();
  expect(screen.container.textContent).toBe("v0.9.0");
});

it("renders nothing without a version", async () => {
  const screen = await render(<BuildStamp version="" commit="0123456" />);

  expect(screen.container.textContent).toBe("");
});
