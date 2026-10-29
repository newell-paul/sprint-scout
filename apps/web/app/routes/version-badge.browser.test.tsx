import { expect, it } from "vitest";
import { render } from "vitest-browser-react/pure";
import VersionBadge from "./version-badge";

const release =
  "https://github.com/newell-paul/sprint-scout/releases/tag/v0.9.0";

it("links the version to its release and names the app and build", async () => {
  const screen = await render(
    <VersionBadge version="0.9.0" commit="0123456789abcdef" />,
  );

  const badge = screen.getByRole("link", {
    name: "SprintScout v0.9.0, build 0123456",
  });
  await expect.element(badge).toHaveAttribute("href", release);
  await expect.element(badge).toHaveAttribute("title", "Build 0123456");
  expect(screen.container.textContent).toBe("v0.9.0");
});

it("names only the app and version when the build has no commit", async () => {
  const screen = await render(<VersionBadge version="0.9.0" commit="" />);

  const badge = screen.getByRole("link", { name: "SprintScout v0.9.0" });
  await expect.element(badge).toHaveAttribute("title", "SprintScout v0.9.0");
  expect(screen.container.textContent).toBe("v0.9.0");
});

it("renders nothing without a version", async () => {
  const screen = await render(<VersionBadge version="" commit="0123456" />);

  expect(screen.container.textContent).toBe("");
});
