import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import ShelterSettings from "./shelter-settings";
import { aria } from "../../test/fixtures";

it("exposed: offers the three presets with exposed pressed", async () => {
  const screen = await render(
    <ShelterSettings value="exposed" onChange={() => true} />,
  );
  const group = screen.getByRole("group", { name: "Shelter level" });
  await expect
    .element(group.getByRole("button", { name: /Exposed/ }))
    .toHaveAttribute("aria-pressed", "true");
  await expect
    .element(group.getByRole("button", { name: /Sheltered/ }))
    .toHaveAttribute("aria-pressed", "false");
  await expect
    .element(group.getByRole("button", { name: /Dense/ }))
    .toHaveTextContent("65% wind reduction");
  await aria(
    "shelter-settings.exposed",
    screen.getByRole("region", { name: "Manual wind shelter" }),
  );
});

it("dense: reports the selected preset", async () => {
  const screen = await render(
    <ShelterSettings value="dense" onChange={() => true} />,
  );
  await expect
    .element(screen.getByRole("button", { name: /Dense/ }))
    .toHaveAttribute("aria-pressed", "true");
  await aria(
    "shelter-settings.dense",
    screen.getByRole("region", { name: "Manual wind shelter" }),
  );
});

it("selecting a preset hands it to onChange", async () => {
  const onChange = vi.fn(() => true);
  const screen = await render(
    <ShelterSettings value="exposed" onChange={onChange} />,
  );
  await screen.getByRole("button", { name: /Sheltered/ }).click();
  expect(onChange).toHaveBeenCalledWith("sheltered");
  await expect.element(screen.getByRole("alert")).not.toBeInTheDocument();
});

it("error: a refused save raises an alert and keeps the setting", async () => {
  const screen = await render(
    <ShelterSettings value="exposed" onChange={() => false} />,
  );
  await screen.getByRole("button", { name: /Dense/ }).click();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Could not save shelter. Existing setting is unchanged.",
    );
  await expect
    .element(screen.getByRole("button", { name: /Exposed/ }))
    .toHaveAttribute("aria-pressed", "true");
  await aria(
    "shelter-settings.error",
    screen.getByRole("region", { name: "Manual wind shelter" }),
  );
});
