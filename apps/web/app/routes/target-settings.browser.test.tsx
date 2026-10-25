import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import TargetSettings from "./target-settings";
import { aria } from "../../test/fixtures";

const region = () => ({ name: "Segment target time" });

it("empty: no target, remove disabled", async () => {
  const screen = await render(
    <TargetSettings target={null} onChange={() => true} />,
  );
  await expect
    .element(screen.getByRole("heading", { level: 3 }))
    .toHaveTextContent("Segment target · Not set");
  await expect
    .element(screen.getByRole("button", { name: "Remove target" }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("textbox", { name: /Target time/ }))
    .toHaveValue("");
  await aria("target-settings.empty", screen.getByRole("region", region()));
});

it("ready: shows the saved target in the heading and the field", async () => {
  const screen = await render(
    <TargetSettings target={90} onChange={() => true} />,
  );
  await expect
    .element(screen.getByRole("heading", { level: 3 }))
    .toHaveTextContent("Segment target · 1m 30s");
  await expect
    .element(screen.getByRole("textbox", { name: /Target time/ }))
    .toHaveValue("1:30");
  await expect
    .element(screen.getByRole("button", { name: "Remove target" }))
    .toBeEnabled();
  await aria("target-settings.ready", screen.getByRole("region", region()));
});

it("saving a valid time hands the seconds to onChange", async () => {
  const onChange = vi.fn(() => true);
  const screen = await render(
    <TargetSettings target={null} onChange={onChange} />,
  );
  await screen.getByRole("textbox", { name: /Target time/ }).fill("2:05");
  await screen.getByRole("button", { name: "Save target" }).click();
  expect(onChange).toHaveBeenCalledWith(125);
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Target saved in this browser.");
});

it("invalid: rejects text that is not minutes:seconds", async () => {
  const onChange = vi.fn(() => true);
  const screen = await render(
    <TargetSettings target={null} onChange={onChange} />,
  );
  await screen.getByRole("textbox", { name: /Target time/ }).fill("fast");
  await screen.getByRole("button", { name: "Save target" }).click();
  expect(onChange).not.toHaveBeenCalled();
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Enter minutes:seconds, from 0:01 to 1440:00.");
  await aria("target-settings.invalid", screen.getByRole("region", region()));
});

it("error: a refused save says so", async () => {
  const screen = await render(
    <TargetSettings target={null} onChange={() => false} />,
  );
  await screen.getByRole("textbox", { name: /Target time/ }).fill("1:00");
  await screen.getByRole("button", { name: "Save target" }).click();
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Target could not be saved. Try again.");
});

it("remove clears the field and reports it", async () => {
  const onChange = vi.fn(() => true);
  const screen = await render(
    <TargetSettings target={90} onChange={onChange} />,
  );
  await screen.getByRole("button", { name: "Remove target" }).click();
  expect(onChange).toHaveBeenCalledWith(null);
  await expect
    .element(screen.getByRole("textbox", { name: /Target time/ }))
    .toHaveValue("");
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Target removed.");
});

it("the field follows a target changed elsewhere", async () => {
  const screen = await render(
    <TargetSettings target={90} onChange={() => true} />,
  );
  await screen.rerender(<TargetSettings target={125} onChange={() => true} />);
  await expect
    .element(screen.getByRole("textbox", { name: /Target time/ }))
    .toHaveValue("2:05");
  await screen.rerender(<TargetSettings target={null} onChange={() => true} />);
  await expect
    .element(screen.getByRole("textbox", { name: /Target time/ }))
    .toHaveValue("");
});
